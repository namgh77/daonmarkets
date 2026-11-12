CREATE TABLE `invite_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`createdBy` int NOT NULL,
	`invitedEmail` varchar(320),
	`status` enum('ACTIVE','USED','REVOKED') NOT NULL DEFAULT 'ACTIVE',
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`usedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invite_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','partner') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `invite_tokens_status_idx` ON `invite_tokens` (`status`);--> statement-breakpoint
CREATE INDEX `invite_tokens_expires_idx` ON `invite_tokens` (`expiresAt`);