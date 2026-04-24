BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [loginId] NVARCHAR(100) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [role] NVARCHAR(20) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'user',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_loginId_key] UNIQUE NONCLUSTERED ([loginId])
);

-- CreateTable
CREATE TABLE [dbo].[Survey] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(1000),
    [createdBy] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Survey_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Survey_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Question] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [surveyId] UNIQUEIDENTIFIER NOT NULL,
    [order] INT NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [text] NVARCHAR(500) NOT NULL,
    CONSTRAINT [Question_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Choice] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [questionId] UNIQUEIDENTIFIER NOT NULL,
    [order] INT NOT NULL,
    [text] NVARCHAR(500) NOT NULL,
    CONSTRAINT [Choice_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Response] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [surveyId] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [submittedAt] DATETIME2 NOT NULL CONSTRAINT [Response_submittedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Response_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Response_surveyId_userId_key] UNIQUE NONCLUSTERED ([surveyId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[Answer] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [responseId] UNIQUEIDENTIFIER NOT NULL,
    [questionId] UNIQUEIDENTIFIER NOT NULL,
    [choiceId] UNIQUEIDENTIFIER,
    [text] NVARCHAR(2000),
    [date] DATETIME2,
    CONSTRAINT [Answer_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Question_surveyId_idx] ON [dbo].[Question]([surveyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Choice_questionId_idx] ON [dbo].[Choice]([questionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Response_surveyId_idx] ON [dbo].[Response]([surveyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Answer_responseId_idx] ON [dbo].[Answer]([responseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Answer_questionId_idx] ON [dbo].[Answer]([questionId]);

-- AddForeignKey
ALTER TABLE [dbo].[Survey] ADD CONSTRAINT [Survey_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Question] ADD CONSTRAINT [Question_surveyId_fkey] FOREIGN KEY ([surveyId]) REFERENCES [dbo].[Survey]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Choice] ADD CONSTRAINT [Choice_questionId_fkey] FOREIGN KEY ([questionId]) REFERENCES [dbo].[Question]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Response] ADD CONSTRAINT [Response_surveyId_fkey] FOREIGN KEY ([surveyId]) REFERENCES [dbo].[Survey]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Response] ADD CONSTRAINT [Response_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Answer] ADD CONSTRAINT [Answer_responseId_fkey] FOREIGN KEY ([responseId]) REFERENCES [dbo].[Response]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Answer] ADD CONSTRAINT [Answer_questionId_fkey] FOREIGN KEY ([questionId]) REFERENCES [dbo].[Question]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Answer] ADD CONSTRAINT [Answer_choiceId_fkey] FOREIGN KEY ([choiceId]) REFERENCES [dbo].[Choice]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
