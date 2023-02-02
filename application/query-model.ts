import DynamoDbHelper from "./helper/dynamodb-helper";
import * as AWS from 'aws-sdk';

export interface PostViewModel {
    id: number,
    user_id: number,
    user_name: string,
    content: string,
    title: string,
    created_at: string
}

/***
 * This model is used to perform read QUERIES from database following CQRS pattern
 */
export default class QueryModel {
    public async getPostView (): Promise<PostViewModel[]> {

        let result: PostViewModel[] = [];

        const items = await new DynamoDbHelper().getPostViewCollection();

        if (items) {
            result = items.map(item => {
                return AWS.DynamoDB.Converter.unmarshall({
                    id: item.id,
                    content: item.content,
                    title: item.title,
                    user_name: item.user_name,
                    user_id: item.user_id,
                    created_at: item.created_at
                }) as PostViewModel;
            })
        }

        return result;
    }
}