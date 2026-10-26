# ALB Production Target Group - Unhealthy Instance(s) Alarm

**Resource:** Application Load Balancer (ALB) Production Servers Target Group

**Trigger Condition:** One or more target instances report as unhealthy

**Alert Destination:** Slack `#alerting` channel via AWS Chatbot

**Severity:** Critical

---

## Rationale & Known Issues

### Database Connection Pool Exhaustion

We have observed intermittent backend failures that manifest as database connectivity issues. This alarm serves as an early warning system for these incidents.

#### Suspected Root Cause

The exact cause is not yet fully understood, but we suspect a bug in either our application code or TypeORM that leads to database connection pool exhaustion or corruption.

#### Triggering Conditions

The issue appears to correlate with:

1. **Peak traffic periods** - Specifically when the `refreshSession` endpoint receives heavy concurrent traffic

#### What Happens

When this bug occurs:

1. The backend's database connection pool becomes exhausted OR connections in a bad state are returned to the free connection pool
2. The backend loses the ability to execute database queries
3. Health check requests fail (health check performs a basic database connectivity check)
4. ALB marks instance(s) as unhealthy
5. **Result:** Widespread system disruption affecting user requests

#### Health Check Mechanism

-   The ALB health check pings our backend API health endpoint
-   The health endpoint performs a rudimentary database connectivity check
-   If database connectivity fails, the health check fails
-   Failed health checks cause the ALB to mark instances as unhealthy, triggering this alarm

---

## Response Procedures

### When the Alarm Fires

1. **Immediate Assessment**

    - Check Slack `#alerting` channel for the alarm notification
    - Verify the platform is up and accessible to users
    - Verify the current time - is this during peak traffic?
    - Check ALB target health status in AWS Console

2. **Investigation Steps**

    **Connect to affected instance:**

    - Use AWS Systems Manager Session Manager to connect to the affected instance
    - Once connected, switch to the ubuntu user:
        ```bash
        sudo su ubuntu
        ```

    **Review application logs:**

    - Check logs for services starting with `lwp_` using journalctl:

        ```bash
        # View recent logs for lwp_backend service
        journalctl -u lwp_backend.service -n 500 --no-pager

        # Follow logs in real-time
        journalctl -u lwp_backend.service -f

        # View all lwp_* services
        journalctl -u 'lwp_*' -n 500 --no-pager
        ```

    - Look for database connection errors, pool exhaustion messages, or timeout errors

    **Check database performance:**

    - Review database performance metrics in AWS Console (RDS Performance Insights if available)
    - Check for:
        - Active database connections
        - Connection pool utilization
        - Long-running queries
        - Deadlocks or slow query performance

    **Analyze traffic patterns:**

    - Check New Relic for request rates, error rates, and endpoint performance
    - Identify if `refreshSession` endpoint is experiencing unusually high load or error rates

3. **Mitigation**

    **Service restart (preferred first step):**

    - Restart the backend service to reset the connection pool without full instance reboot:
        ```bash
        sudo systemctl restart lwp_backend.service
        ```
    - Monitor the service status and logs after restart:
        ```bash
        sudo systemctl status lwp_backend.service
        journalctl -u lwp_backend.service -f
        ```

    **Instance reboot (if service restart doesn't resolve the issue):**

    - Reboot the affected instance(s) via AWS Console or CLI
    - Monitor ALB target health to confirm instance recovery

    **Scaling (if traffic-related):**

    - Scale up instance count if the issue correlates with high traffic volume

### Monitoring & Prevention

-   Continue monitoring correlation between alarm triggers and peak traffic
-   Investigate TypeORM connection pool configuration and usage patterns

---

## Future Improvements

-   [ ] Identify and fix the root cause of connection pool exhaustion
-   [ ] Add additional CloudWatch/New Relic metrics for database connection pool health (active connections, idle connections, connection wait time, checkout time, pool exhaustion events)
-   [ ] Implement circuit breakers for database operations (automatically stop DB requests when failures are detected, allow fast-fail instead of timeouts, enable graceful degradation)
-   [ ] Consider implementing connection pool health checks independent of ALB health checks

---

## Technical Details

### Integration

-   **Monitoring Service:** AWS CloudWatch
-   **Notification Service:** AWS Chatbot
-   **Communication Platform:** Slack
-   **Channel:** `#alerting`

### Related Components

-   Application Load Balancer (ALB)
-   Backend API instances
-   Database connection pool (TypeORM)
-   Health check endpoint
-   `refreshSession` endpoint
