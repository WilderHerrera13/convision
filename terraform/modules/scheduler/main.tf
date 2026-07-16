resource "aws_iam_role" "scheduler" {
  name = "${var.project}-${var.environment}-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "scheduler" {
  name = "ec2-rds-start-stop"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances"
        ]
        Resource = "arn:aws:ec2:*:*:instance/${var.ec2_instance_id}"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:StartDBInstance",
          "rds:StopDBInstance"
        ]
        Resource = "arn:aws:rds:*:*:db:${var.rds_instance_identifier}"
      }
    ]
  })
}

resource "aws_scheduler_schedule_group" "main" {
  name = "${var.project}-${var.environment}-schedules"
}

resource "aws_scheduler_schedule" "ec2_start" {
  name       = "${var.project}-${var.environment}-ec2-start"
  group_name = aws_scheduler_schedule_group.main.name

  schedule_expression          = "cron(0 6 ? * MON-SAT *)"
  schedule_expression_timezone = "America/Bogota"

  flexible_time_window { mode = "OFF" }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:startInstances"
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ InstanceIds = [var.ec2_instance_id] })
  }
}

resource "aws_scheduler_schedule" "ec2_stop" {
  name       = "${var.project}-${var.environment}-ec2-stop"
  group_name = aws_scheduler_schedule_group.main.name

  schedule_expression          = "cron(0 19 ? * MON-SAT *)"
  schedule_expression_timezone = "America/Bogota"

  flexible_time_window { mode = "OFF" }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:stopInstances"
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ InstanceIds = [var.ec2_instance_id] })
  }
}

resource "aws_scheduler_schedule" "rds_start" {
  name       = "${var.project}-${var.environment}-rds-start"
  group_name = aws_scheduler_schedule_group.main.name

  schedule_expression          = "cron(0 6 ? * MON-SAT *)"
  schedule_expression_timezone = "America/Bogota"

  flexible_time_window { mode = "OFF" }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:startDBInstance"
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ DbInstanceIdentifier = var.rds_instance_identifier })
  }
}

resource "aws_scheduler_schedule" "rds_stop" {
  name       = "${var.project}-${var.environment}-rds-stop"
  group_name = aws_scheduler_schedule_group.main.name

  schedule_expression          = "cron(0 19 ? * MON-SAT *)"
  schedule_expression_timezone = "America/Bogota"

  flexible_time_window { mode = "OFF" }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:stopDBInstance"
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ DbInstanceIdentifier = var.rds_instance_identifier })
  }
}
