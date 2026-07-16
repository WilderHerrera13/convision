data "aws_ami" "amazon_linux_2023_arm" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

resource "aws_key_pair" "main" {
  key_name   = "${var.project}-${var.environment}-key"
  public_key = var.ssh_public_key
}

resource "aws_iam_role" "ec2" {
  name = "${var.project}-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ssm_read" {
  name = "ssm-read"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ]
      Resource = "arn:aws:ssm:${var.region}:*:parameter${var.ssm_prefix}/*"
    }]
  })
}

resource "aws_iam_role_policy" "s3_uploads" {
  name = "s3-uploads"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        "arn:aws:s3:::${var.uploads_bucket}",
        "arn:aws:s3:::${var.uploads_bucket}/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy" "ecr_pull" {
  name = "ecr-pull"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_cloudwatch_agent" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project}-${var.environment}-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_instance" "api" {
  ami                    = data.aws_ami.amazon_linux_2023_arm.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.security_group_id]
  key_name               = aws_key_pair.main.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  disable_api_termination = true

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    delete_on_termination = false
  }

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    region                  = var.region
    ssm_prefix              = var.ssm_prefix
    uploads_bucket          = var.uploads_bucket
    docker_image            = var.docker_image
    api_domain              = var.api_domain
    bootstrap_default_users = var.bootstrap_default_users
    start_api_body = templatefile("${path.module}/start-api.sh.tpl", {
      region                  = var.region
      ssm_prefix              = var.ssm_prefix
      uploads_bucket          = var.uploads_bucket
      docker_image            = var.docker_image
      bootstrap_default_users = var.bootstrap_default_users
      api_log_group_name      = var.api_log_group_name
    })
    cwagent_json = templatefile("${path.module}/cwagent-config.json.tpl", {
      nginx_log_group_name = var.nginx_log_group_name
    })
  })

  user_data_replace_on_change = false

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [ami, user_data]
  }

  tags = { Name = "${var.project}-${var.environment}-api" }
}

resource "aws_eip" "api" {
  instance = aws_instance.api.id
  domain   = "vpc"

  tags = { Name = "${var.project}-${var.environment}-eip" }
}
