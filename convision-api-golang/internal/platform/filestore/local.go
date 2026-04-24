package filestore

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type LocalStorage struct {
	root string
}

func NewLocalStorage(root string) *LocalStorage {
	return &LocalStorage{root: root}
}

func (s *LocalStorage) Store(_ context.Context, key string, r io.Reader, _ int64, _ string) (string, error) {
	full := filepath.Join(s.root, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return "", err
	}
	f, err := os.Create(full)
	if err != nil {
		return "", err
	}
	defer f.Close()
	if _, err := io.Copy(f, r); err != nil {
		_ = os.Remove(full)
		return "", err
	}
	base := strings.TrimSuffix(strings.TrimSpace(os.Getenv("STORAGE_LOCAL_BASE_URL")), "/")
	if base == "" {
		base = ""
	}
	rel := "/uploads/" + strings.TrimPrefix(filepath.ToSlash(key), "/")
	if base != "" {
		return fmt.Sprintf("%s%s", base, rel), nil
	}
	return rel, nil
}
