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
package amazon.aws.samples.kafka;

import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

@Component
public class KafkaConsumer {
    private static final Logger LOGGER = LoggerFactory.getLogger(KafkaConsumer.class);

    private final AdminClient adminClient;
    private final DynamoDBService dynamoDBService;
    private final KafkaConsumerProperties properties;
    private final String uuid;

    public KafkaConsumer(DynamoDBService dynamoDBService, AdminClient adminClient, KafkaConsumerProperties properties) {
        this.adminClient = adminClient;
        this.dynamoDBService = dynamoDBService;
        this.properties = properties;
        uuid = UUID.randomUUID().toString();
        LOGGER.info("Starting KafkaConsumer: " + uuid);
    }

    @KafkaListener(groupId = "#{kafkaConsumerProperties.groupId}", topics = {"#{kafkaConsumerProperties.topic}"}, containerFactory = "kafkaListenerContainerFactory")
    public void listen(Message message) {
        LOGGER.info("Received message accountId: {}, value: {}", message.getAccountId(), message.getValue());
        try {
            long balance = dynamoDBService.updateBalance(properties.getTableName(), message.getAccountId(), message.getValue());
            LOGGER.debug("[" + uuid + "] Balance after transaction for account id {} is equal to: {}", message.getAccountId(), balance);
        } catch (BalanceException e) {
            LOGGER.error("[" + uuid + "] " + e.getMessage());
        }
    }

    @PostConstruct
    public void postConstruct() throws ExecutionException, InterruptedException {
        LOGGER.info("Topic metadata");
        Map<TopicPartition, OffsetAndMetadata> metadataMap = adminClient.listConsumerGroupOffsets(properties.getGroupId()).partitionsToOffsetAndMetadata().get();
        for (Map.Entry<TopicPartition, OffsetAndMetadata> entry : metadataMap.entrySet()) {
            LOGGER.info(entry.getKey().toString() + " " + entry.getValue().metadata());
        }
    }
}
