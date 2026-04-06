package main

import (
	"fmt"
	"os"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/cli/commands"
	"github.com/spf13/cobra"
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "cli",
		Short: "CLI for Go Chi MFA Dynamo",
	}

	rootCmd.AddCommand(commands.NewLoginCommand())
	rootCmd.AddCommand(commands.NewWhoAmICommand())
	rootCmd.AddCommand(commands.NewURLCommand())

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
