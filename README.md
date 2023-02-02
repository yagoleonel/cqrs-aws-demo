# CQRS demo in AWS with CDK

## _About CQRS_

CQRS stands for __Command Query Responsibility Segregation__. 
The main goal of this pattern, as the name suggests, is to make sure that the Command and Query models are segregated.
Command is the model responsible for updating data into a DB instance while Query is the model responsible for reading it.
And not only it, but the update and read database instances are also supposed to be segregated.

![N|Solid](https://miro.medium.com/max/837/1*TaPzEj91HM06UgZoajqGwA.png)

Benefits on using CQRS pattern:

* Improves database I/O operations performance
* Separation of concerns
* Simpler queries

It's good to mention that this pattern is recommended for complex structures only.
Never for simple CRUD operations.

Sources:
https://martinfowler.com/bliki/CQRS.html
https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
https://medium.com/@marcelomg21/cqrs-command-query-responsibility-segregation-em-uma-arquitetura-de-micro-servi%C3%A7os-71dcb687a8a9
https://www.eventstore.com/cqrs-pattern

## _About this demo_

#### Context
This project simulates a system where you can create and fetch posts for a possible frontend feed and applies the __CQRS__ pattern using the following logic:

There are two API endpoints:
_POST /post_
_GET /post_

The first is used to create a new __post__ and __user__ entities in two separated relational tables, using MySQL, using Amazon RDS service.
The second is used to fetch created __post__ and __user__ from a single synthetized table from __DynamoDB__.

The data is replicated from __RDS__ to __DynamoDB__ through  event processing by a __SQS__ queue and a replicate function in Lambda.

#### AWS Services used
- [API Gateway] - API service.
- [Lambda] - FAAS (Function as a service).
- [SQS] - Queue processing.
- [DynamoDB] - NoSQL Database.
- [RDS] - Relational database (MySQL).
- [Secrets Manager] - Credentials storage.

## _Commands to deploy_

* `npm run package`                         compile typescript to js
* `cdk deploy --profile <aws_profile>`      deploy this stack to your default AWS account/region
* `cdk diff --profile <aws_profile>`        compare deployed stack with current state
* `cdk synth --profile <aws_profile>`       emits the synthesized CloudFormation template
 
_ATENTION: This project is a demo and does not implement security best practices. Do not deploy to a productive AWS account._

## _Testing the solution_

Grab the generated api gateway endpoint. 

Replace in testing-cqrs.js file.
Execute the following command:
```sh
node test-cqrs.js --create
```

It should create a new register in your RDS instance in both post and user tables.
Also trigger replicate lambda through SQS and save a new post-view register in DynamoDB as well.

To fetch all the created registers in DynamoDB, run:
```sh
node test-cqrs.js --fetch
```
