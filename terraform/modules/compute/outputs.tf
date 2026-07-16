output "instance_id" { value = aws_instance.api.id }
output "eip_public_ip" { value = aws_eip.api.public_ip }
output "iam_role_name" { value = aws_iam_role.ec2.name }
