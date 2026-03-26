CREATE TABLE `onboarding_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentStep` int NOT NULL DEFAULT 0,
	`cliConnected` int NOT NULL DEFAULT 0,
	`firstAgentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingCompleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingStep` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `firstAgentCreated` int DEFAULT 0 NOT NULL;