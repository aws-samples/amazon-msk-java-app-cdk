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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.ByteArrayDeserializer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.config.KafkaListenerEndpointRegistry;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.MessageListenerContainer;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.ContainerTestUtils;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static amazon.aws.samples.kafka.DynamoDBService.BALANCE;
import static amazon.aws.samples.kafka.DynamoDBService.ID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
@TestPropertySource(properties = {
        "consumer.group-id=GROUP_ID",
        "consumer.table-name=TABLE_NAME",
        "consumer.topic=" + KafkaConsumerTest.TOPIC
})
@DirtiesContext
@EmbeddedKafka(partitions = 1, topics = {KafkaConsumerTest.TOPIC})
class KafkaConsumerTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    public static final String TOPIC = "transactions";

    @MockBean
    private DynamoDbClient dynamoDbClient;

    @SpyBean
    private KafkaConsumer consumer;


    @Autowired
    private EmbeddedKafkaBroker broker;

    @Autowired
    private KafkaListenerEndpointRegistry registry;

    @BeforeEach
    public void init() {
        for (MessageListenerContainer container : registry.getAllListenerContainers()) {
            ContainerTestUtils.waitForAssignment(container, 1);
        }
    }

    @Test
    void listen() throws JsonProcessingException, InterruptedException, ExecutionException, TimeoutException {
        Message expected = new Message("Account1", 123L);
        when(dynamoDbClient.getItem(any(GetItemRequest.class))).thenReturn(GetItemResponse.builder().build());
        Map<String, AttributeValue> attributes = Map.of(BALANCE, AttributeValue.builder().n(expected.getValue().toString()).build());
        when(dynamoDbClient.updateItem(any(UpdateItemRequest.class))).thenReturn(UpdateItemResponse.builder().attributes(attributes).build());

        Map<String, Object> producerProps = KafkaTestUtils.producerProps(broker);
        producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        KafkaProducer<String, String> producer = new KafkaProducer<>(producerProps);
        producer.send(new ProducerRecord<>(TOPIC, 0, "key", MAPPER.writeValueAsString(expected))).get(10, TimeUnit.SECONDS);
        producer.flush();

        ArgumentCaptor<Message> messageArgumentCaptor = ArgumentCaptor.forClass(Message.class);
        verify(consumer, timeout(60_000)).listen(messageArgumentCaptor.capture());

        ArgumentCaptor<UpdateItemRequest> updateItemRequestArgumentCaptor = ArgumentCaptor.forClass(UpdateItemRequest.class);
        verify(dynamoDbClient, timeout(60_000)).updateItem(updateItemRequestArgumentCaptor.capture());

        Message actual = messageArgumentCaptor.getValue();
        assertThat(actual).usingRecursiveComparison().isEqualTo(expected);

        UpdateItemRequest updateItemRequest = updateItemRequestArgumentCaptor.getValue();
        assertThat(updateItemRequest.key().get(ID).s()).isEqualTo(expected.getAccountId());
        assertThat(updateItemRequest.updateExpression()).isEqualTo("ADD " + BALANCE + " :v");
        assertThat(updateItemRequest.expressionAttributeValues().get(":v").n()).isEqualTo(expected.getValue().toString());
    }

    @TestConfiguration
    public static class KafkaConsumerTestConfig {

        @Value("${" + EmbeddedKafkaBroker.SPRING_EMBEDDED_KAFKA_BROKERS + "}")
        private String brokerAddresses;

        @Bean
        public AdminClient adminClient() {
            Map<String, Object> configs = new HashMap<>();
            configs.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, brokerAddresses);
            return AdminClient.create(configs);
        }

        @Bean
        public ConsumerFactory<String, byte[]> consumerFactory() {
            Map<String, Object> configs = new HashMap<>();
            configs.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, brokerAddresses);
            configs.put(ConsumerConfig.GROUP_ID_CONFIG, "TEST");
            configs.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
            configs.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ByteArrayDeserializer.class);

            return new DefaultKafkaConsumerFactory<>(configs);
        }

        @Bean
        public Region awsRegion(KafkaConsumerProperties properties) {
            System.out.println(properties);
            return Region.EU_CENTRAL_1;
        }
    }
}
