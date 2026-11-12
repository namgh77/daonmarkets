CREATE TABLE IF NOT EXISTS `faq_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` varchar(250) NOT NULL,
	`answer` text NOT NULL,
	`published` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faq_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `attachmentName` varchar(255);--> statement-breakpoint
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `attachmentUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `attachmentType` varchar(120);--> statement-breakpoint
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `attachmentSize` int;--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN IF NOT EXISTS `attachmentName` varchar(255);--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN IF NOT EXISTS `attachmentUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN IF NOT EXISTS `attachmentType` varchar(120);--> statement-breakpoint
ALTER TABLE `materials` ADD COLUMN IF NOT EXISTS `attachmentSize` int;--> statement-breakpoint
INSERT INTO `faq_items` (`question`, `answer`, `published`, `sortOrder`)
SELECT '수익을 보장하나요?', '아닙니다. 수익이나 지급을 보장하지 않으며, 서비스 이용 전 운영 정책과 위험을 확인해야 합니다.', true, 1
WHERE NOT EXISTS (SELECT 1 FROM `faq_items` WHERE `question` = '수익을 보장하나요?');
--> statement-breakpoint
INSERT INTO `faq_items` (`question`, `answer`, `published`, `sortOrder`)
SELECT 'EA를 정말 무료로 받을 수 있나요?', '제공 여부와 조건은 운영자가 게시한 최신 안내를 기준으로 확인해 주세요.', true, 2
WHERE NOT EXISTS (SELECT 1 FROM `faq_items` WHERE `question` = 'EA를 정말 무료로 받을 수 있나요?');
--> statement-breakpoint
INSERT INTO `faq_items` (`question`, `answer`, `published`, `sortOrder`)
SELECT '제 돈을 맡기는 건가요?', '회원 서비스 화면은 신청·검토 기록을 표시합니다. 실제 자금 보관이나 자동 송금 여부는 별도 운영 정책을 확인해야 합니다.', true, 3
WHERE NOT EXISTS (SELECT 1 FROM `faq_items` WHERE `question` = '제 돈을 맡기는 건가요?');
--> statement-breakpoint
INSERT INTO `faq_items` (`question`, `answer`, `published`, `sortOrder`)
SELECT '초보자도 할 수 있나요?', '초보자도 안내 자료를 확인할 수 있지만, 내용을 충분히 이해하고 본인의 판단과 책임으로 이용해야 합니다.', true, 4
WHERE NOT EXISTS (SELECT 1 FROM `faq_items` WHERE `question` = '초보자도 할 수 있나요?');
--> statement-breakpoint
INSERT INTO `faq_items` (`question`, `answer`, `published`, `sortOrder`)
SELECT '가입 후 무엇을 캡처해서 보내야 하나요?', '운영자가 요구한 안내가 있을 때만 필요한 화면을 확인해 보내 주세요. 비밀번호·개인키·복구 문구는 보내지 마세요.', true, 5
WHERE NOT EXISTS (SELECT 1 FROM `faq_items` WHERE `question` = '가입 후 무엇을 캡처해서 보내야 하나요?');
--> statement-breakpoint
INSERT INTO `faq_items` (`question`, `answer`, `published`, `sortOrder`)
SELECT '성과는 어디서 확인하나요?', '운영자가 게시한 공지와 회원 자료실에서 확인합니다. 화면의 예상 계산은 실제 지급이나 성과를 보장하지 않습니다.', true, 6
WHERE NOT EXISTS (SELECT 1 FROM `faq_items` WHERE `question` = '성과는 어디서 확인하나요?');
