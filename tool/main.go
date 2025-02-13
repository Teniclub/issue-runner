package main

import (
	"fmt"
	"log"
	"os"

	"github.com/spf13/cobra"
	flag "github.com/spf13/pflag"
)

var (
	version = "dev"
	commit  = "none"
	//date    = "unknown"
)

// TODO Add function to return version string

var (
	cfgTmp   string
	cfgMerge bool
	cfgYes   bool
	cfgNo    bool
	cfgClean bool
)

var errHostExecDisabled = fmt.Errorf("execution of MWEs on the host is disabled, use an OCI container instead")
var errEmptyBody = fmt.Errorf("no supported content found")

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:     "issue-runner",
	Version: version + "-" + commit,
	Short:   "issue-runner executes MWEs from markdown files",
	Long: `Execute Minimal Working Examples (MWEs) defined in markdown files,
in the body of GitHub issues or as tarballs/zipfiles.
Site: github.com/1138-4EB/issue-runner`,
	Args: cobra.MinimumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		_, err := run(args, true)
		if err != nil {
			log.Fatal(err)
		}
	},
}

var srcsCmd = &cobra.Command{
	Use:   "sources",
	Short: "extract sources but do not execute any MWE",
	Args:  cobra.MinimumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		mwes, err := run(args, false)
		if err != nil {
			log.Fatal(err)
		}
		mwes.print()
	},
}

func init() {
	rootCmd.AddCommand(srcsCmd)
	for _, c := range []*cobra.Command{rootCmd, srcsCmd} {
		commonFlags(c.Flags())
	}
}

func commonFlags(f *flag.FlagSet) {
	f.StringVarP(&cfgTmp, "tmp", "t", "", "base directory for temporal dirs")
	f.BoolVarP(&cfgMerge, "merge", "m", false, "merge arguments in a single MWE")
	f.BoolVarP(&cfgYes, "yes", "y", false, "non-interactive: execute MWEs on the host")
	f.BoolVarP(&cfgNo, "no", "n", false, "non-interactive: do not execute MWEs on the host")
	f.BoolVarP(&cfgClean, "clean", "c", false, "remove sources after executing MWEs")
}

func run(args []string, exec bool) (*mwes, error) {
	es, err := processArgs(args)
	if err != nil {
		return nil, err
	}
	if len(*es) == 0 {
		log.Println("no MWE was found, exiting")
		return nil, err
	}
	if err := es.generate(cfgTmp); err != nil {
		return es, err
	}
	if exec {
		err := es.execute()
		if err != nil {
			return es, err
		}
	}
	if cfgClean {
		for _, e := range *es {
			fmt.Println("Removing...", e.dir)
			os.RemoveAll(e.dir)
		}
	}
	return es, nil
}
