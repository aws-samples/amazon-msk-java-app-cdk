#!/usr/bin/env node
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {KafkaStack} from '../lib/kafka-stack';
import {VpcStack} from "../lib/vpc-stack";
import {DynamoDbStack} from "../lib/dynamodb-stack";
import {FargateStack} from "../lib/fargate-stack";
import {LambdaStack} from "../lib/lambda-stack";
import {KafkaTopicStack} from "../lib/kafka-topic-stack";

const app = new cdk.App();

let vpcStack = new VpcStack(app, 'VpcStack');

let dynamoDbStack = new DynamoDbStack(app, 'DynamoDbStack');

let kafkaStack = new KafkaStack(vpcStack, app, 'KafkaStack');
kafkaStack.addDependency(vpcStack);

let kafkaTopicStack = new KafkaTopicStack(vpcStack, kafkaStack, app, 'KafkaTopicStack');
kafkaTopicStack.addDependency(vpcStack);
kafkaTopicStack.addDependency(kafkaStack);

let lambdaStack = new LambdaStack(vpcStack, kafkaStack, app, 'LambdaStack');
lambdaStack.addDependency(vpcStack);
lambdaStack.addDependency(kafkaStack);

let fargateStack = new FargateStack(vpcStack, app, 'FargateStack');
fargateStack.addDependency(vpcStack);
