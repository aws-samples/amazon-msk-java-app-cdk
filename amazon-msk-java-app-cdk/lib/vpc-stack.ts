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
import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";

export class VpcStack extends cdk.Stack {
    public vpc: ec2.Vpc;
    public kafkaSecurityGroup: ec2.SecurityGroup;
    public fargateSercurityGroup: ec2.SecurityGroup;
    public bastionHostSecurityGroup: ec2.SecurityGroup;
    public lambdaSecurityGroup: ec2.SecurityGroup;

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.vpc = new ec2.Vpc(this, 'vpc');

        this.kafkaSecurityGroup = new ec2.SecurityGroup(this, 'kafkaSecurityGroup', {
            securityGroupName: 'kafkaSecurityGroup',
            vpc: this.vpc,
            allowAllOutbound: true
        });

        this.fargateSercurityGroup = new ec2.SecurityGroup(this, 'fargateSecurityGroup', {
            securityGroupName: 'fargateSecurityGroup',
            vpc: this.vpc,
            allowAllOutbound: true
        });

        this.bastionHostSecurityGroup = new ec2.SecurityGroup(this, 'bastionHostSecurityGroup', {
            securityGroupName: 'bastionHostSecurityGroup',
            vpc: this.vpc,
            allowAllOutbound: true
        });

        this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'lambdaSecurityGroup', {
            securityGroupName: 'lambdaSecurityGroup',
            vpc: this.vpc,
            allowAllOutbound: true
        });

        this.kafkaSecurityGroup.connections.allowFrom(this.bastionHostSecurityGroup, ec2.Port.allTraffic(), "allowFromBastionToKafka");
        this.kafkaSecurityGroup.connections.allowFrom(this.lambdaSecurityGroup, ec2.Port.allTraffic(), "allowFromLambdaToKafka");
        // this.kafkaSecurityGroup.connections.allowTo(this.bastionHostSecurityGroup, ec2.Port.allTraffic(), "allowToBastionFromBastion");
        this.kafkaSecurityGroup.connections.allowFrom(this.fargateSercurityGroup, ec2.Port.allTraffic(), "allowFromFargateToKafka");
        // this.kafkaSecurityGroup.connections.allowTo(this.fargateSercurityGroup, ec2.Port.allTraffic(), "allowToFargateFromKafka");

        // this.bastionHostSecurityGroup.connections.allowTo(this.fargateSercurityGroup, ec2.Port.allTraffic(), "allowToFargateFromBastion");

        this.fargateSercurityGroup.connections.allowFrom(this.bastionHostSecurityGroup, ec2.Port.allTraffic(), "allowFromBastionToFargate");
        this.fargateSercurityGroup.connections.allowFrom(this.kafkaSecurityGroup, ec2.Port.allTraffic(), "allowFromKafkaToFargate");
        // this.fargateSercurityGroup.connections.allowTo(this.kafkaSecurityGroup, ec2.Port.allTraffic(), "allowToKafkaFromFargate");
    }
}
