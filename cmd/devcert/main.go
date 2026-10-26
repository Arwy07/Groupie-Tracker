// Génère un certificat de développement local unique, sans autorité racine partagée.
package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"
)

func main() {
	if err := generate(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func generate() error {
	for _, name := range []string{"localhost.crt", "localhost.key"} {
		if _, err := os.Stat(filepath.Join("certs", name)); err == nil {
			return fmt.Errorf("certs/%s existe déjà ; aucun fichier n'a été remplacé", name)
		} else if !os.IsNotExist(err) {
			return err
		}
	}
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return err
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return err
	}
	template := &x509.Certificate{
		SerialNumber: serial, Subject: pkix.Name{CommonName: "localhost"},
		NotBefore: time.Now().Add(-time.Minute), NotAfter: time.Now().AddDate(1, 0, 0),
		DNSNames: []string{"localhost"}, IPAddresses: []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")},
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll("certs", 0700); err != nil {
		return err
	}
	keyFile, err := os.OpenFile("certs/localhost.key", os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	err = pem.Encode(keyFile, &pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})
	closeErr := keyFile.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	certFile, err := os.OpenFile("certs/localhost.crt", os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		return err
	}
	err = pem.Encode(certFile, &pem.Block{Type: "CERTIFICATE", Bytes: der})
	closeErr = certFile.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	fmt.Println("Certificat local créé dans certs/. Ces fichiers restent privés.")
	return nil
}
