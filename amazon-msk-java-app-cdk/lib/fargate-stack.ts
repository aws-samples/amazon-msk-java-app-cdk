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
import * as cdk from 'aws-cdk-lib';
import {CfnParameter} from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {InstanceClass, InstanceSize} from "aws-cdk-lib/aws-ec2";
import {VpcStack} from "./vpc-stack";
import * as assets from "aws-cdk-lib/aws-ecr-assets";
import * as iam from "aws-cdk-lib/aws-iam";
import {Effect} from "aws-cdk-lib/aws-iam";
import { Construct } from 'constructs';

export class FargateStack extends cdk.Stack {
    private tableName = "Accounts";
    private groupId = "transaction-consumers";

    constructor(vpcStack: VpcStack, scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        let bootstrapAddress = new CfnParameter(this, "bootstrapAddress", {
            type: "String",
            description: "Bootstrap address for Kafka broker. Corresponds to bootstrap.servers Kafka consumer configuration"
        });

        let topicName = new CfnParameter(this, "topicName", {
            type: "String",
            description: "Kafka topic name"
        });

        const image = new assets.DockerImageAsset(this, "ConsumerImage", {
            directory: '../consumer/docker'
        });

        const fargateTaskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
            memoryLimitMiB: 4096,
            cpu: 512
        });

        const cluster = new ecs.Cluster(this, 'Cluster', {
            vpc: vpcStack.vpc
        });

        cluster.addCapacity('DefaultAutoScalingGroupCapacity', {
            instanceType: ec2.InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),//new ec2.InstanceType("t2.xlarge"),
            desiredCapacity: 1,
        });

        fargateTaskDefinition.addContainer("KafkaConsumer", {
            image: ecs.ContainerImage.fromDockerImageAsset(image),
            logging: ecs.LogDrivers.awsLogs({streamPrefix: 'KafkaConsumer'}),
            environment: {
                'TABLE_NAME': this.tableName,
                'GROUP_ID': this.groupId,
                'BOOTSTRAP_ADDRESS': bootstrapAddress.valueAsString,
                'REGION': this.region,
                'TOPIC_NAME': topicName.valueAsString
            }
        });

        //TODO: harden security
        fargateTaskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["kafka:*"],
                resources: ["*"]
            }
        ));
        fargateTaskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["dynamodb:GetItem", "dynamodb:UpdateItem"],
            resources: ["*"]
        }));

        const service = new ecs.FargateService(this, 'Service', {
            cluster: cluster,
            securityGroups: [vpcStack.fargateSercurityGroup],
            taskDefinition: fargateTaskDefinition,
            desiredCount: 1
        });
    }
}
