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

import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.Map;

@Service
public class DynamoDBService {

    public static final String BALANCE = "Balance";
    public static final String ID = "id";
    private final DynamoDbClient client;

    public DynamoDBService(DynamoDbClient client) {
        this.client = client;
    }

    /**
     * This operation is thread safe on the condition that there is at maximum one Kafka consumer listening per single partition.
     * Transactions on a single account are placed in the same Kafka topic partition in order of transaction execution.
     * When condition holds there will be at maximum one thread performing operation on a specific account at a time.
     *
     * @param tableName
     * @param accountId
     * @param value
     * @return
     * @throws BalanceException
     */
    public long updateBalance(String tableName, String accountId, long value) throws BalanceException {
        GetItemResponse getItemResponse = client.getItem(GetItemRequest.builder()
                .key(Map.of(ID, AttributeValue.builder().s(accountId).build()))
                .tableName(tableName)
                .build());
        if (getItemResponse.hasItem()) {
            long balance = Long.parseLong(getItemResponse.item().get(BALANCE).n());
            if (balance + value < 0) {
                throw new BalanceException("Insufficient funds. accountId: " + accountId + " balance: " + balance + " value: " + value);
            }
        }

        UpdateItemResponse updateItemResponse = client.updateItem(UpdateItemRequest.builder()
                .key(Map.of(ID, AttributeValue.builder().s(accountId).build()))
                .tableName(tableName)
                .expressionAttributeValues(Map.of(":v", AttributeValue.builder().n(String.valueOf(value)).build()))
                .updateExpression("ADD " + BALANCE + " :v")
                .returnValues(ReturnValue.ALL_NEW)
                .build());
        return Long.parseLong(updateItemResponse.attributes().get(BALANCE).n());
    }
}
