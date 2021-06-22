#!/usr/bin/env bash
# export AWS_PROFILE=<REPLACE WITH YOUR AWS PROFILE NAME> or alternatively follow instructions on https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_prerequisites

cd ../amazon-msk-java-app-cdk || exit

echo "Destroying FargateStack..."
cdk destroy FargateStack --force --verbose

echo "Destroying KafkaTopicStack"
cdk destroy KafkaTopicStack --force --verbose

echo "Destroying KafkaStack..."
cdk destroy KafkaStack --force --verbose

echo "Destroying DynamoDbStack..."
cdk destroy DynamoDbStack --force --verbose

echo "Deploying LambdaStack..."
cdk destroy LambdaStack --force --verbose

echo "Destroying VpcStack..."
cdk destroy VpcStack --force --verbose
