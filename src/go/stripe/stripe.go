package stripe

import (
	"os"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/paymentintent"
)

type Client struct {
	SecretKey      string
	PublishableKey string
}

func NewClient() *Client {
	secretKey := os.Getenv("STRIPE_SECRET_KEY")
	publishableKey := os.Getenv("STRIPE_PUBLISHABLE_KEY")

	stripe.Key = secretKey

	return &Client{
		SecretKey:      secretKey,
		PublishableKey: publishableKey,
	}
}

func (c *Client) CreatePaymentIntent(amount float64, currency string) (*stripe.PaymentIntent, error) {
	amountInCents := int64(amount * 100)

	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(amountInCents),
		Currency: stripe.String(currency),
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(true),
		},
	}

	return paymentintent.New(params)
}

func (c *Client) ConfirmPaymentIntent(paymentIntentID string) (*stripe.PaymentIntent, error) {
	return paymentintent.Get(paymentIntentID, nil)
}

func (c *Client) GetPublishableKey() string {
	return c.PublishableKey
}

