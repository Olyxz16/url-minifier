package commands

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/cli/auth"
	"github.com/Olyxz16/go-chi-oauth-psql/internal/cli/client"
	"github.com/spf13/cobra"
)

func NewURLCommand() *cobra.Command {
	urlCmd := &cobra.Command{
		Use:   "url",
		Short: "Manage short URLs",
	}

	urlCmd.AddCommand(newCreateURLCommand())

	return urlCmd
}

func newCreateURLCommand() *cobra.Command {
	var apiURL string
	var redirectURL string

	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create a new short URL",
		RunE: func(cmd *cobra.Command, args []string) error {
			if redirectURL == "" {
				return fmt.Errorf("redirect-url is required")
			}

			tokenStore := auth.NewTokenStore("go-chi-oauth-psql-cli")
			if _, err := tokenStore.LoadTokens(); err != nil {
				return fmt.Errorf("not logged in. Run 'login' command first")
			}

			transport := &client.AuthTransport{
				Base:       http.DefaultTransport,
				BaseURL:    apiURL,
				TokenStore: tokenStore,
			}

			httpClient := &http.Client{
				Transport: transport,
				Timeout:   10 * time.Second,
			}

			reqBody, _ := json.Marshal(map[string]string{
				"redirect_url": redirectURL,
			})

			resp, err := httpClient.Post(apiURL+"/urls", "application/json", bytes.NewBuffer(reqBody))
			if err != nil {
				return fmt.Errorf("failed to contact API: %w", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode == http.StatusUnauthorized {
				return fmt.Errorf("session expired or invalid. Please login again")
			}
			if resp.StatusCode != http.StatusCreated {
				return fmt.Errorf("API returned error: %s", resp.Status)
			}

			var result struct {
				ID          string `json:"id"`
				ShortUrl    string `json:"short_url"`
				RedirectUrl string `json:"redirect_url"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
				return fmt.Errorf("failed to decode response: %w", err)
			}

			fmt.Println("Short URL created successfully!")
			fmt.Printf("ID:         %s\n", result.ID)
			fmt.Printf("Short URL:  %s/%s\n", apiURL+"/urls", result.ShortUrl)
			fmt.Printf("Redirects:  %s\n", result.RedirectUrl)

			return nil
		},
	}

	cmd.Flags().StringVar(&apiURL, "api-url", "http://localhost:8080", "API Base URL")
	cmd.Flags().StringVar(&redirectURL, "redirect-url", "", "The URL to redirect to (required)")
	cmd.MarkFlagRequired("redirect-url")

	return cmd
}
