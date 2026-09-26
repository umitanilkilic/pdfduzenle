package ratelimit

import (
	"testing"
	"time"
)

func TestBurstThenRefill(t *testing.T) {
	now := time.Unix(0, 0)
	l := New(60, 3, func() time.Time { return now }) // one token per second

	for i := range 3 {
		if !l.Allow("a") {
			t.Fatalf("request %d within burst was refused", i)
		}
	}
	if l.Allow("a") {
		t.Fatal("request over burst was allowed")
	}
	if !l.Allow("b") {
		t.Fatal("keys must be independent")
	}
	now = now.Add(time.Second)
	if !l.Allow("a") {
		t.Fatal("token not refilled after a second")
	}
}

func TestPruneForgetsIdleKeys(t *testing.T) {
	now := time.Unix(0, 0)
	l := New(60, 2, func() time.Time { return now })
	l.Allow("a")
	now = now.Add(2 * time.Minute)
	l.Allow("b")
	if _, ok := l.buckets["a"]; ok {
		t.Fatal("idle bucket was not pruned")
	}
}
