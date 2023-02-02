import { Context, SQSEvent } from 'aws-lambda';
import DynamoDbHelper from '../helper/dynamodb-helper';

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);

    const messageBody = JSON.parse(event.Records[0].body);
    console.log(JSON.stringify({ messageBody }));

    await new DynamoDbHelper().createPostView(messageBody);
};