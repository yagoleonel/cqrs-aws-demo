import RdsHelper from "./helper/rds-helper";
import SQSHelper from "./helper/sqs-helper";


export interface PostModel {
    title: string,
    content: string
}

export interface UserModel {
    username: string
}

/***
 * This model is used to perform UPDATES in database following CQRS pattern
 */
export default class CommandModel {
    public async createPost (post: PostModel, user: UserModel): Promise<string> {
        const rdsConnection = await RdsHelper.getConnection(process.env.DB_CREDENTIALS_SECRET_ARN!)
    
        const [postCreated, userCreated] = await Promise.all([
            rdsConnection.createPost(post),
            rdsConnection.createUser(user)
        ])
    
        console.debug(postCreated);
        console.debug(userCreated);

        await new SQSHelper().sendMessage({
            content: post.content,
            created_at: new Date().toISOString(),
            title: post.title,
            user_name: user.username,
            user_id: userCreated.insertId,
            id: postCreated.insertId
        })

        return postCreated.insertId
    }
}