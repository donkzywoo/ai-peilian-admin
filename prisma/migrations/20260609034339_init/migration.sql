-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "nickname" VARCHAR(50),
    "avatar_url" TEXT,
    "exam_type" VARCHAR(20),
    "target_school" VARCHAR(100),
    "target_major" VARCHAR(100),
    "exam_date" DATE,
    "daily_study_hours" INTEGER NOT NULL DEFAULT 4,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" VARCHAR(20) NOT NULL DEFAULT 'free',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "exam_type" VARCHAR(20) NOT NULL,
    "subject" VARCHAR(50) NOT NULL,
    "chapter" VARCHAR(100),
    "type" VARCHAR(20) NOT NULL,
    "difficulty" VARCHAR(10) NOT NULL,
    "content" JSONB NOT NULL,
    "knowledge_points" TEXT[],
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "user_answer" TEXT NOT NULL,
    "score" DECIMAL(5,2),
    "feedback" JSONB,
    "is_correct" BOOLEAN,
    "time_spent" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wrong_questions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "answer_record_id" UUID NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "next_review_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wrong_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "exam_type" VARCHAR(20) NOT NULL,
    "subject_scope" VARCHAR(50) NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMPTZ,
    "submitted_at" TIMESTAMPTZ,
    "total_score" DECIMAL(5,2),
    "report" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_answers" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "user_answer" TEXT,
    "is_correct" BOOLEAN,
    "score" DECIMAL(5,2),
    "question_order" INTEGER NOT NULL,

    CONSTRAINT "exam_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_data" JSONB NOT NULL,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_tasks" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "subject" VARCHAR(50),
    "task_description" TEXT,
    "estimated_minutes" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "study_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "deck_name" VARCHAR(100),
    "front_content" TEXT NOT NULL,
    "back_content" TEXT NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "ease_factor" DECIMAL(3,1) NOT NULL DEFAULT 2.5,
    "interval_days" INTEGER NOT NULL DEFAULT 0,
    "next_review_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" VARCHAR(20) NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "payment_method" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "third_party_trade_no" VARCHAR(100),
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_exam_type_subject_chapter_idx" ON "questions"("exam_type", "subject", "chapter");

-- CreateIndex
CREATE INDEX "questions_user_id_idx" ON "questions"("user_id");

-- CreateIndex
CREATE INDEX "questions_is_public_idx" ON "questions"("is_public");

-- CreateIndex
CREATE INDEX "answer_records_user_id_created_at_idx" ON "answer_records"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wrong_questions_user_id_next_review_at_idx" ON "wrong_questions"("user_id", "next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "wrong_questions_answer_record_id_key" ON "wrong_questions"("answer_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_plans_user_id_key" ON "study_plans"("user_id");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_action_created_at_idx" ON "usage_logs"("user_id", "action", "created_at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_records" ADD CONSTRAINT "answer_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_records" ADD CONSTRAINT "answer_records_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_questions" ADD CONSTRAINT "wrong_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_questions" ADD CONSTRAINT "wrong_questions_answer_record_id_fkey" FOREIGN KEY ("answer_record_id") REFERENCES "answer_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "study_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
