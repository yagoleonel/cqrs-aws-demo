import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as iam from 'aws-cdk-lib/aws-iam';
import * as customresources from 'aws-cdk-lib/custom-resources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaeventsources from 'aws-cdk-lib/aws-lambda-event-sources'

export class CqrsDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /// RDS instance
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true
    })
    const rdsSecretCredentials = new secretsmanager.Secret(this, 'cqrs-demo-db-credentials', {
      description: 'RDS instance credentials',
      secretName: 'cqrs-demo-rds-db-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'cqrs_demo',
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password',
      }
    });
    const rdsPort = 3306;
    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'cqrs-rds-security-group', {
      securityGroupName: 'cqrs-rds-security-group',
      vpc,
    })
    const rdsDatabaseName = 'cqrs_demo_post_db'
    rdsSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(rdsPort), 'cqrs-rds-instance')
    const rdsInstance = new rds.DatabaseInstance(this, 'cqrs-demo-db', {
      engine: rds.DatabaseInstanceEngine.MYSQL,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      databaseName: rdsDatabaseName,
      credentials: rds.Credentials.fromSecret(rdsSecretCredentials),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      port: rdsPort,
      securityGroups: [rdsSecurityGroup],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      backupRetention: cdk.Duration.days(0),
      deleteAutomatedBackups: true,
    })

    /// Dynamo DB Table
    const dynamoDbTable = new dynamodb.Table(this, 'cqrsdemopostview', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableClass: dynamodb.TableClass.STANDARD_INFREQUENT_ACCESS,
      tableName: 'cqrs-demo-post-view',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    /// SQS queue
    const replicatePostSqsQueue = new sqs.Queue(this, 'replicate-post-queue', {
      queueName: 'cqrs-demo-replicate-post-queue',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })


    /// lambdas
    ///
    const lambdaDynamoDbPolicy = new iam.Policy(this, 'lambda-dynamo-table', {
      policyName: 'lambda-dynamo-table',
      statements:[ 
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:UpdateItem',
            'dynamodb:PutItem',
            'dynamodb:Scan'
          ],
          resources: [dynamoDbTable.tableArn]
        })
      ]
    })
    const lambdaSecretManagerPolicy = new iam.Policy(this, 'lambda-secrets-manager', {
      policyName: 'lambda-secrets-manager',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'secretsmanager:GetSecretValue'
          ],
          resources: [rdsSecretCredentials.secretArn]
        })
      ]
    })
    const lambdaSqsPolicy =  new iam.Policy(this, 'lambda-replicate-post-sqs', {
      policyName: 'lambda-replicate-post-sqs',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'sqs:SendMessage',
            'sqs:DeleteMessage',
            'sqs:ReceiveMessage'
          ],
          resources: [replicatePostSqsQueue.queueArn]
        })
      ]
    })

    ///
    const bdInitLambda = new lambda.Function(this, 'db-init-lambda', {
      code: lambda.Code.fromAsset('.dist/application'),
      handler: 'setup/database-init.handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        DB_CREDENTIALS_SECRET_ARN: rdsSecretCredentials.secretArn,
        DB_HOST: rdsInstance.instanceEndpoint.hostname,
        DB_PORT: rdsInstance.instanceEndpoint.port.toString(),
        DB_NAME: rdsDatabaseName,
      },
    })
    bdInitLambda.role?.attachInlinePolicy(lambdaSecretManagerPolicy)
    const customResourceProvider = new customresources.Provider(this, 'cqrs-database-seed-provider', {
      onEventHandler: bdInitLambda
    })
    new cdk.CustomResource(this, 'cqrs-demo-custom-resource', {
      serviceToken: customResourceProvider.serviceToken,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    ///
    const addNewPostLambda = new lambda.Function(this, 'add-new-post', {
      code: lambda.Code.fromAsset('.dist/application/'),
      handler: 'api/add-new-post.handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        DB_CREDENTIALS_SECRET_ARN: rdsSecretCredentials.secretArn,
        DB_HOST: rdsInstance.instanceEndpoint.hostname,
        DB_PORT: rdsInstance.instanceEndpoint.port.toString(),
        DB_NAME: rdsDatabaseName,
        REPLICATE_POST_QUEUE_URL: replicatePostSqsQueue.queueUrl
      }
    });
    addNewPostLambda.role?.attachInlinePolicy(lambdaSecretManagerPolicy)
    addNewPostLambda.role?.attachInlinePolicy(lambdaSqsPolicy)
    ///
    const replicatePostLambda = new lambda.Function(this, 'replicate-post', {
      code: lambda.Code.fromAsset('.dist/application/'),
      handler: 'sqs/replicate-post.handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        POST_VIEW_DYNAMO_TABLE: dynamoDbTable.tableName
      }
    });
    replicatePostLambda.role?.attachInlinePolicy(lambdaDynamoDbPolicy);
    replicatePostLambda.role?.attachInlinePolicy(lambdaSqsPolicy)
    const eventSource = new lambdaeventsources.SqsEventSource(replicatePostSqsQueue);
    replicatePostLambda.addEventSource(eventSource);
    ///
    const getPostLambda = new lambda.Function(this, 'get-post', {
      code: lambda.Code.fromAsset('.dist/application/'),
      handler: 'api/get-post.handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        POST_VIEW_DYNAMO_TABLE: dynamoDbTable.tableName
      }      
    });
    getPostLambda.role?.attachInlinePolicy(lambdaDynamoDbPolicy);

    /// api gateway
    const cqrsDemoApi = new apigw.RestApi(this, 'cqrs-demo-api');
    const cqrsDemoApiResource = cqrsDemoApi.root.addResource('post');
    cqrsDemoApiResource.addMethod('POST', new apigw.LambdaIntegration(addNewPostLambda));
    cqrsDemoApiResource.addMethod('GET', new apigw.LambdaIntegration(getPostLambda));
  }
}
