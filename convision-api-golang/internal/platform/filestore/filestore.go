package filestore

import (
	"context"
	"io"
	"os"
	"strings"
)

type Storage interface {
	Store(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error)
}

type LocalInfo struct {
	RootPath string
}

func NewFromEnv() (Storage, LocalInfo) {
	driver := strings.ToLower(strings.TrimSpace(os.Getenv("STORAGE_DRIVER")))
	if driver == "s3" {
		return newS3FromEnv(), LocalInfo{}
	}
	root := strings.TrimSpace(os.Getenv("STORAGE_LOCAL_PATH"))
	if root == "" {
		root = "./uploads"
	}
	return NewLocalStorage(root), LocalInfo{RootPath: root}
}
