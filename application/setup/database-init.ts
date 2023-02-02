import { Context, CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse, CloudFormationCustomResourceFailedResponse, CloudFormationCustomResourceSuccessResponse } from 'aws-lambda';
// import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

import RdsHelper from '../helper/rds-helper';

export const handler = async (event: CloudFormationCustomResourceEvent, context: Context): Promise<CloudFormationCustomResourceResponse> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    
    try {
        console.log(`process.env.DB_CREDENTIALS_SECRET_ARN: ${process.env.DB_CREDENTIALS_SECRET_ARN}`);

        const rdsConnection = await RdsHelper.getConnection(process.env.DB_CREDENTIALS_SECRET_ARN!)
        const seedDatabaseResult = await rdsConnection.initDatabase();

        console.debug(seedDatabaseResult);
    } catch (error) {
        console.log('ERROR', error);
        return {
            Status: 'FAILED',
            Reason: JSON.stringify(error)
        } as CloudFormationCustomResourceFailedResponse;
    }

    return {
        Status: 'SUCCESS'
    } as CloudFormationCustomResourceSuccessResponse;
};