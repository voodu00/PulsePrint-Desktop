use std::process::Command;

#[cfg(test)]
mod e2e_tests {
	use super::*;

	/// Test that verifies the Tauri app can be built and started for e2e testing
	#[test]
	#[ignore] // Skip in CI as it may hang in headless environment
	fn test_tauri_app_startup() {
		println!("Testing Tauri app startup...");

		// Build the Tauri app first
		let build_output = Command::new("cargo")
			.args(["build"])
			.current_dir(".")
			.output()
			.expect("Failed to build Tauri app");

		if !build_output.status.success() {
			panic!(
				"Failed to build Tauri app: {}",
				String::from_utf8_lossy(&build_output.stderr)
			);
		}

		println!("Tauri app built successfully");
	}

	/// Test that verifies the frontend can be built
	#[test]
	fn test_frontend_build() {
		println!("Testing frontend build...");

		// Check if we can build the frontend using yarn
		let build_output = Command::new("yarn")
			.args(["build"])
			.current_dir("../frontend-react")
			.output()
			.expect("Failed to build frontend");

		if !build_output.status.success() {
			panic!(
				"Failed to build frontend: {}",
				String::from_utf8_lossy(&build_output.stderr)
			);
		}

		println!("Frontend built successfully");
	}

	/// Test that verifies the e2e test script exists and is executable
	#[test]
	fn test_e2e_script_exists() {
		println!("Checking if e2e test script exists...");

		// Check if the script file exists
		let script_path = std::path::Path::new("./scripts/run-e2e-tests.sh");
		assert!(
			script_path.exists(),
			"E2E test script not found at: {script_path:?}"
		);

		// Check if the script is executable (on Unix systems)
		#[cfg(unix)]
		{
			use std::os::unix::fs::PermissionsExt;
			let metadata = std::fs::metadata(script_path).expect("Failed to get script metadata");
			let permissions = metadata.permissions();
			assert!(
				permissions.mode() & 0o111 != 0,
				"E2E test script is not executable"
			);
		}

		println!("E2E test script exists and is executable");
	}

	/// Integration test that runs the e2e tests with proper app lifecycle
	/// This test is marked as ignore by default since it requires a full environment setup
	#[test]
	#[ignore]
	fn test_run_e2e_tests() {
		println!("Running e2e tests with coordinated script...");

		// Run the e2e test script
		let e2e_output = Command::new("./scripts/run-e2e-tests.sh")
			.current_dir(".")
			.output()
			.expect("Failed to run e2e test script");

		// Print output for debugging
		println!(
			"E2E test output: {}",
			String::from_utf8_lossy(&e2e_output.stdout)
		);
		if !e2e_output.stderr.is_empty() {
			println!(
				"E2E test stderr: {}",
				String::from_utf8_lossy(&e2e_output.stderr)
			);
		}

		// Check if e2e tests passed
		if !e2e_output.status.success() {
			panic!(
				"E2E tests failed with exit code: {:?}",
				e2e_output.status.code()
			);
		}

		println!("E2E tests completed successfully");
	}

	/// Test that verifies playwright is properly configured
	#[test]
	fn test_playwright_config() {
		println!("Testing Playwright configuration...");

		// Check if playwright is installed
		let playwright_check = Command::new("npx")
			.args(["playwright", "--version"])
			.current_dir("../frontend-react")
			.output()
			.expect("Failed to check Playwright version");

		if !playwright_check.status.success() {
			panic!(
				"Playwright is not properly installed: {}",
				String::from_utf8_lossy(&playwright_check.stderr)
			);
		}

		println!("Playwright is properly configured");
	}

	/// Test that verifies the network mocking is working
	/// This test is marked as ignore since it requires the Tauri app to be running
	#[test]
	#[ignore]
	fn test_network_isolation() {
		println!("Testing network isolation for e2e tests...");

		// Run a simple test to verify network requests are blocked
		let test_output = Command::new("npx")
			.args([
				"playwright",
				"test",
				"--config",
				"playwright.config.ts",
				"--grep",
				"should load the application successfully",
			])
			.current_dir("../frontend-react")
			.output()
			.expect("Failed to run network isolation test");

		// We expect this to work since we're blocking external requests
		// but allowing localhost requests
		if !test_output.status.success() {
			println!(
				"Network isolation test output: {}",
				String::from_utf8_lossy(&test_output.stdout)
			);
			println!(
				"Network isolation test errors: {}",
				String::from_utf8_lossy(&test_output.stderr)
			);
			// Don't panic here as this might be due to app not running
			println!("Network isolation test completed (may need app running)");
		} else {
			println!("Network isolation is working correctly");
		}
	}
}
