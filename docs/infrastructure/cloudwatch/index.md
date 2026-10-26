# AWS CloudWatch Alarms

## Overview

This document describes the AWS CloudWatch alarms configured for our infrastructure, their purpose, and the underlying issues they help us monitor.

## Current Alarms

### Application Load Balancer

-   [ALB Production Target Group - Unhealthy Instance(s)](alarms/alb-production-unhealthy-instances.md) - Monitors for unhealthy backend instances, often indicating database connection pool issues
