package paypal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type Client struct {
	ClientID     string
	ClientSecret string
	BaseURL      string
	AccessToken  string
	HTTPClient   *http.Client
}

func NewClient() *Client {
	clientID := os.Getenv("PAYPAL_CLIENT_ID")
	clientSecret := os.Getenv("PAYPAL_CLIENT_SECRET")

	mode := os.Getenv("PAYPAL_MODE")
	if mode == "" {
		mode = "sandbox"
	}

	var baseURL string
	if mode == "production" {
		baseURL = "https://api-m.paypal.com"
	} else {
		baseURL = "https://api-m.sandbox.paypal.com"
	}

	return &Client{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		BaseURL:      baseURL,
		HTTPClient:   &http.Client{},
	}
}

func (c *Client) GetAccessToken() (string, error) {
	if c.AccessToken != "" {
		return c.AccessToken, nil
	}

	url := fmt.Sprintf("%s/v1/oauth2/token", c.BaseURL)

	req, err := http.NewRequest("POST", url, bytes.NewBufferString("grant_type=client_credentials"))
	if err != nil {
		return "", err
	}

	req.SetBasicAuth(c.ClientID, c.ClientSecret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("erreur PayPal: %s", string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
	}

	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", err
	}

	c.AccessToken = tokenResp.AccessToken
	return c.AccessToken, nil
}

type OrderRequest struct {
	Intent             string             `json:"intent"`
	PurchaseUnits      []PurchaseUnit     `json:"purchase_units"`
	ApplicationContext ApplicationContext `json:"application_context"`
}

type PurchaseUnit struct {
	ReferenceID string `json:"reference_id"`
	Amount      Amount `json:"amount"`
	Description string `json:"description,omitempty"`
}

type Amount struct {
	CurrencyCode string `json:"currency_code"`
	Value        string `json:"value"`
}

type ApplicationContext struct {
	BrandName   string `json:"brand_name,omitempty"`
	LandingPage string `json:"landing_page,omitempty"`
	UserAction  string `json:"user_action,omitempty"`
	ReturnURL   string `json:"return_url"`
	CancelURL   string `json:"cancel_url"`
}

type OrderResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Links  []Link `json:"links"`
}

type Link struct {
	Href   string `json:"href"`
	Rel    string `json:"rel"`
	Method string `json:"method"`
}

func (c *Client) CreateOrder(total float64, returnURL, cancelURL string) (*OrderResponse, error) {
	token, err := c.GetAccessToken()
	if err != nil {
		return nil, err
	}

	orderReq := OrderRequest{
		Intent: "CAPTURE",
		PurchaseUnits: []PurchaseUnit{
			{
				ReferenceID: "default",
				Amount: Amount{
					CurrencyCode: "EUR",
					Value:        fmt.Sprintf("%.2f", total),
				},
				Description: "Achat de billets de concert",
			},
		},
		ApplicationContext: ApplicationContext{
			BrandName:   "Groupie Tracker",
			LandingPage: "NO_PREFERENCE",
			UserAction:  "PAY_NOW",
			ReturnURL:   returnURL,
			CancelURL:   cancelURL,
		},
	}

	jsonData, err := json.Marshal(orderReq)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/v2/checkout/orders", c.BaseURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	req.Header.Set("Prefer", "return=representation")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("erreur PayPal (status %d): %s", resp.StatusCode, string(body))
	}

	var orderResp OrderResponse
	if err := json.Unmarshal(body, &orderResp); err != nil {
		return nil, err
	}

	return &orderResp, nil
}

type CaptureOrderResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Amount Amount `json:"amount"`
}

func (c *Client) CaptureOrder(orderID string) (*CaptureOrderResponse, error) {
	token, err := c.GetAccessToken()
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/v2/checkout/orders/%s/capture", c.BaseURL, orderID)
	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	req.Header.Set("Prefer", "return=representation")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("erreur PayPal (status %d): %s", resp.StatusCode, string(body))
	}

	var captureResp struct {
		ID            string `json:"id"`
		Status        string `json:"status"`
		PurchaseUnits []struct {
			Payments struct {
				Captures []CaptureOrderResponse `json:"captures"`
			} `json:"payments"`
		} `json:"purchase_units"`
	}

	if err := json.Unmarshal(body, &captureResp); err != nil {
		return nil, err
	}

	if len(captureResp.PurchaseUnits) == 0 || len(captureResp.PurchaseUnits[0].Payments.Captures) == 0 {
		return nil, fmt.Errorf("aucune capture trouvée dans la réponse")
	}

	capture := captureResp.PurchaseUnits[0].Payments.Captures[0]
	capture.ID = captureResp.ID
	capture.Status = captureResp.Status

	return &capture, nil
}

func (order *OrderResponse) GetApprovalURL() string {
	for _, link := range order.Links {
		if link.Rel == "approve" {
			return link.Href
		}
	}
	return ""
}

