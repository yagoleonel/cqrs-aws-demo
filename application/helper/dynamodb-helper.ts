import * as AWS from 'aws-sdk';
import { PostViewModel } from '../query-model';

export default class DynamoDbHelper {

    private dynamo: AWS.DynamoDB

    constructor () {
        this.dynamo = new AWS.DynamoDB({ region: process.env.AWS_REGION });
    }

    public async createPostView (postView: PostViewModel): Promise<AWS.DynamoDB.PutItemOutput> {

        const params: AWS.DynamoDB.PutItemInput = {
            TableName: process.env.POST_VIEW_DYNAMO_TABLE!,
            Item: {
                'id': { S: postView.id.toString() },
                'user_id': { S: postView.user_id.toString() },
                'user_name': { S: postView.user_name },
                'content': { S: postView.content },
                'title': { S: postView.title },
                'created_at': { S: postView.created_at}
            }
        };

        return new Promise((resolve, reject) => {
            this.dynamo.putItem(params, (err, data) => {
                if (err) {
                    console.log('Error creating dynamoDb post view', err);
                    reject(err);
                }
                resolve(data);
            })
        }) 
    }

    public async getPostViewCollection (): Promise<AWS.DynamoDB.ItemList | undefined> {
        const params: AWS.DynamoDB.ScanInput = {
            TableName: process.env.POST_VIEW_DYNAMO_TABLE!,
            Limit: 10,
        };

        const items: AWS.DynamoDB.ItemList | undefined = await new Promise((resolve, reject) => {
            this.dynamo.scan(params, (err, data) => {
                if (err) {
                    console.log('Unable to read from dynamo table', err)
                    reject(err)
                }
                resolve(data.Items)
            })
        })

        return items;
    }

}