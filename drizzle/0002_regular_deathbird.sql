CREATE TABLE `finance_request_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('deposit','withdrawal') NOT NULL,
	`requestId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`fromStatus` enum('PENDING') NOT NULL,
	`toStatus` enum('APPROVED','REJECTED') NOT NULL,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `finance_request_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `finance_request_reviews_kind_request_unique` UNIQUE(`kind`,`requestId`)
);
