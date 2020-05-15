DRAW = ./cmd/draw.go

all: run


run:
	go run -race ${DRAW}


# build for specific OS target
build-%:
	GOOS=$* GOARCH=amd64 go build -o draw-$* ${DRAW}


build:
	go build -o draw ${DRAW}


# clean any generated files
clean:
	rm -rvf draw draw-*
