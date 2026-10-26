# prevents an ongoing memory leak in the CodeDeploy agent
# this is a bit ridiculous, but not much alternative for now
# see https://github.com/aws/aws-codedeploy-agent/issues/308

sleep 7s
systemctl restart codedeploy-agent