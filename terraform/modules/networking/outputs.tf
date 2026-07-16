output "vpc_id" { value = aws_vpc.main.id }
output "subnet_a_id" { value = aws_subnet.public_a.id }
output "subnet_b_id" { value = aws_subnet.public_b.id }
output "sg_ec2_id" { value = aws_security_group.ec2.id }
output "sg_rds_id" { value = aws_security_group.rds.id }
