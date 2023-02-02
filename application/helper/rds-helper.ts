import * as AWS from 'aws-sdk';
import * as mysql from 'mysql';
import { PostModel, UserModel } from '../command-model';

export default class RdsHelper {
    private connection: mysql.Connection;
    
    private static instance: RdsHelper;
 
    public static readonly POST_TABLE: string = 'cqrs_demo_post';
    public static readonly USER_TABLE: string = 'cqrs_demo_user';
    
    private constructor() {
        //
    }

    private async setConnectionConfig (secretId: string): Promise<mysql.ConnectionConfig> {
        try {
            const secretsmanager = new AWS.SecretsManager({
                region: process.env.AWS_REGION
            });

            const getSecretValueResult: AWS.SecretsManager.GetSecretValueResponse = await new Promise((resolve, reject) => {
                secretsmanager.getSecretValue({
                    SecretId: secretId
                }, (err, data) => {
                    if (err) {
                        console.log('get secret err', err)
                        reject(err);
                    }
                    console.debug(data)
                    resolve(data);
                });
            })

            if (!getSecretValueResult.SecretString) {
                throw Error('Secret value not found');
            }

            const credentials = JSON.parse(getSecretValueResult.SecretString)

            return {
                host: process.env.DB_HOST!,
                port: parseInt(process.env.DB_PORT!),
                user: credentials.username,
                password: credentials.password,
                database: process.env.DB_NAME!,
                multipleStatements: true
            }
        } catch (error) {
            console.log('Error getting RDS credentials', error);
            throw error;
        }
    }

    public static async getConnection (secretId: string): Promise<RdsHelper> {
        if (!RdsHelper.instance) {
            RdsHelper.instance = new RdsHelper();
        }
        
        const connectionConfig: mysql.ConnectionConfig = await RdsHelper.instance.setConnectionConfig(secretId);

        if (!RdsHelper.instance.connection) {
            RdsHelper.instance.connection = mysql.createConnection(connectionConfig);
        }
        return RdsHelper.instance;
    }

    public async initDatabase (): Promise<any> {
        this.checkConnection()

        const createTableQuery = 
            `CREATE TABLE if not exists ${RdsHelper.POST_TABLE} (`
                + `post_id INT AUTO_INCREMENT PRIMARY KEY,`
                + `post_title VARCHAR(255),`
                + `post_content VARCHAR(255),`
                + `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); `
            + `CREATE TABLE if not exists ${RdsHelper.USER_TABLE} (`
                +`user_id INT AUTO_INCREMENT PRIMARY KEY,`
                +`user_name VARCHAR(255),`
                +`created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;

        return new Promise((resolve, reject) => {
            this.connection.query(createTableQuery, (err, result) => {
                if (err) {
                    console.log('error creating tables', err);
                    reject(err);
                }

                resolve(result)
            });
        });
    }

    public async createPost (post: PostModel): Promise<Record<string, any>> {
        this.checkConnection()
        //
        return new Promise((resolve, reject) => {
            this.connection.query(`INSERT into ${RdsHelper.POST_TABLE} SET ?`, {
                post_title: post.title,
                post_content: post.content
            }, (err, result) => {
                if (err) {
                    console.log('Error on creating post', err);
                    reject(err)
                }
                resolve(result)
            })
        })
    }

    public async createUser (user: UserModel): Promise<Record<string, any>> {
        this.checkConnection()
        //
        return new Promise((resolve, reject) => {
            this.connection.query(`INSERT into ${RdsHelper.USER_TABLE} SET ?`, {
                user_name: user.username
            }, (err, result) => {
                if (err) {
                    console.log('Error on creating user', err);
                    reject(err)
                }
                resolve(result)
            })
        })                
    }

    private checkConnection (): void {
        if (!this.connection) {
            throw Error('db connection not initiated');
        }
    }
}