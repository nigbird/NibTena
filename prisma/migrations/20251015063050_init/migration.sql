-- AlterTable
CREATE SEQUENCE doctor_id_seq;
ALTER TABLE "Doctor" ALTER COLUMN "id" SET DEFAULT nextval('doctor_id_seq');
ALTER SEQUENCE doctor_id_seq OWNED BY "Doctor"."id";
