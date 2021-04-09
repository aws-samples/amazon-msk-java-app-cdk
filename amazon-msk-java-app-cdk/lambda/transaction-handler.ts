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

const {Kafka} = require('kafkajs')

const TOPIC = process.env.TOPIC_NAME;
const BROKERS = process.env.BOOTSTRAP_ADDRESS?.split(',')

const kafka = new Kafka({
    clientId: 'transaction-handler',
    brokers: BROKERS,
    ssl: true
});
const producer = kafka.producer();
const admin = kafka.admin();
let topicCreated = false;

interface TransactionEvent {
    accountId: number
    value: number
}

interface TransactionResult {
    status: "SUCCESS" | "FAILURE"
}

//More on kafkajs client: https://kafka.js.org/
export const handler = async (event: TransactionEvent, context: any = {}): Promise<TransactionResult> => {
    if (!topicCreated) {
        //TODO: this ideally should be done once somewhere outside of lambda for example in the bastion host or during deploy
        console.log("Connecting to kafka admin...");
        await admin.connect();
        console.log(`Creating topic: ${TOPIC}...`);
        await admin.createTopics({
            topics: [{
                topic: TOPIC,
                numPartitions: 1,
                replicationFactor: 2
            }]
        });
        topicCreated = true;
        await admin.disconnect()
        console.log(`Created topic: ${TOPIC}`);
    }

    console.log("Connecting to kafka producer...");
    await producer.connect();
    console.log(`Sending message ${JSON.stringify(event)} to kafka ...`);
    await producer.send({
        topic: TOPIC,
        messages: [{value: JSON.stringify(event)}],
    });
    console.log("Message sent");
    await producer.disconnect();
    console.log("Kafka disconnected");
    return Promise.resolve({status: "SUCCESS"});
}
