ALTER TABLE `deposit_requests` ADD `entrySource` enum('MEMBER_REQUEST','ADMIN_ENTRY') DEFAULT 'MEMBER_REQUEST' NOT NULL;--> statement-breakpoint
ALTER TABLE `deposit_requests` ADD `recordedBy` int;