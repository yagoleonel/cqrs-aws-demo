import * as AWS from 'aws-sdk';
import { PostViewModel } from '../query-model';

export default class SQSHelper {
    private sqs: AWS.SQS;

    constructor () {
        this.sqs = new AWS.SQS()
    }

    public async sendMessage (postView: PostViewModel): Promise<void> {
        const params: AWS.SQS.Types.SendMessageRequest = {
            MessageBody: JSON.stringify(postView),
            QueueUrl: process.env.REPLICATE_POST_QUEUE_URL!
        }
        await this.sqs.sendMessage(params).promise();
    }
}