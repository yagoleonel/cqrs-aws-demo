import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import QueryModel from '../query-model';

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const posts = await new QueryModel().getPostView();

    return {
        statusCode: 200,
        body: JSON.stringify(posts)
    };
};