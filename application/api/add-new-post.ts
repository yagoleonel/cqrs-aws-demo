import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import CommandModel from '../command-model';

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Empty body'
                })
            }
        }
    
        const {
            post,
            user
        } = JSON.parse(event.body);

        const newPostId = await new CommandModel().createPost(post, user);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Post created successfully`,
                id: newPostId 
            }),
        };
    } catch (error) {
        console.log('Error', error)
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Unexpected error'
            })
        }
    }
};