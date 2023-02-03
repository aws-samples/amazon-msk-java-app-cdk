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
import * as cdk from "aws-cdk-lib";
import {CfnParameter, Duration} from "aws-cdk-lib";
import {VpcStack} from "./vpc-stack";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {KafkaStack} from "./kafka-stack";
import {Runtime} from "aws-cdk-lib/aws-lambda"
import { Construct } from "constructs";

export class LambdaStack extends cdk.Stack {
    constructor(vpcStack: VpcStack, kafkaStack: KafkaStack, scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        let bootstrapAddress = new CfnParameter(this, "bootstrapAddress", {
            type: "String",
            description: "Bootstrap address for Kafka broker. Corresponds to bootstrap.servers Kafka consumer configuration"
        });

        let topicName = new CfnParameter(this, "topicName", {
            type: "String",
            description: "Kafka topic name"
        });

        let transactionHandler = new NodejsFunction(this, "TransactionHandler", {
            runtime: Runtime.NODEJS_14_X,
            entry: 'lambda/transaction-handler.ts',
            handler: 'handler',
            vpc: vpcStack.vpc,
            securityGroups: [vpcStack.lambdaSecurityGroup],
            functionName: 'TransactionHandler',
            timeout: Duration.minutes(5),
            environment: {
                'BOOTSTRAP_ADDRESS': bootstrapAddress.valueAsString,
                'TOPIC_NAME': topicName.valueAsString
            }
        });

        transactionHandler.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['kafka:*'],
            resources: [kafkaStack.kafkaCluster.ref]
        }));

    }
}
