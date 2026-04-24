package filestore

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Storage struct {
	client *s3.Client
	bucket string
	region string
}

func newS3FromEnv() *S3Storage {
	bucket := strings.TrimSpace(os.Getenv("STORAGE_S3_BUCKET"))
	region := strings.TrimSpace(os.Getenv("STORAGE_S3_REGION"))
	if region == "" {
		region = "us-east-1"
	}
	key := strings.TrimSpace(os.Getenv("AWS_ACCESS_KEY_ID"))
	secret := strings.TrimSpace(os.Getenv("AWS_SECRET_ACCESS_KEY"))
	var cfg aws.Config
	var err error
	if key != "" && secret != "" {
		cfg, err = config.LoadDefaultConfig(context.Background(),
			config.WithRegion(region),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(key, secret, "")),
		)
	} else {
		cfg, err = config.LoadDefaultConfig(context.Background(), config.WithRegion(region))
	}
	if err != nil {
		return &S3Storage{client: nil, bucket: bucket, region: region}
	}
	return &S3Storage{
		client: s3.NewFromConfig(cfg),
		bucket: bucket,
		region: region,
	}
}

func (s *S3Storage) Store(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error) {
	if s.client == nil || s.bucket == "" {
		return "", fmt.Errorf("s3: client or bucket not configured")
	}
	key = strings.TrimPrefix(key, "/")
	in := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        r,
		ContentType: aws.String(contentType),
	}
	if size > 0 {
		in.ContentLength = aws.Int64(size)
	}
	_, err := s.client.PutObject(ctx, in)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key), nil
}
