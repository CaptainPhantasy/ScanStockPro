#!/bin/bash

# Comprehensive Test Runner for ScanStock Pro
# This script runs all tests and provides detailed analysis

set -e

echo "🚀 Starting Comprehensive Test Suite for ScanStock Pro"
echo "=================================================="

# Create test results directory
mkdir -p test-results/screenshots
mkdir -p test-results/reports

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if server is running
check_server() {
    print_status "Checking if development server is running..."
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Server is running on http://localhost:3000"
    else
        print_error "Server is not running. Please start with 'npm run dev'"
        exit 1
    fi
}

# Run comprehensive test suite
run_comprehensive_tests() {
    print_status "Running comprehensive test suite..."
    
    # Run tests with detailed output
    npx playwright test comprehensive-test-suite.spec.ts \
        --reporter=html,json,junit \
        --output-dir=test-results \
        --workers=1 \
        --timeout=30000
    
    if [ $? -eq 0 ]; then
        print_success "Comprehensive tests completed successfully"
    else
        print_error "Comprehensive tests failed"
        return 1
    fi
}

# Run visual regression tests
run_visual_tests() {
    print_status "Running visual regression tests..."
    
    # Run visual tests
    npx playwright test visual-regression.spec.ts \
        --reporter=html,json,junit \
        --output-dir=test-results \
        --workers=1 \
        --timeout=30000
    
    if [ $? -eq 0 ]; then
        print_success "Visual regression tests completed successfully"
    else
        print_error "Visual regression tests failed"
        return 1
    fi
}

# Run existing test suites
run_existing_tests() {
    print_status "Running existing test suites..."
    
    # Run all existing tests
    npx playwright test \
        --reporter=html,json,junit \
        --output-dir=test-results \
        --workers=1 \
        --timeout=30000 \
        --grep-invert="comprehensive-test-suite|visual-regression"
    
    if [ $? -eq 0 ]; then
        print_success "Existing tests completed successfully"
    else
        print_error "Existing tests failed"
        return 1
    fi
}

# Generate test report
generate_report() {
    print_status "Generating comprehensive test report..."
    
    # Count test results
    local total_tests=$(find test-results -name "*.json" -exec jq '.stats.total' {} \; | awk '{sum+=$1} END {print sum}')
    local passed_tests=$(find test-results -name "*.json" -exec jq '.stats.passed' {} \; | awk '{sum+=$1} END {print sum}')
    local failed_tests=$(find test-results -name "*.json" -exec jq '.stats.failed' {} \; | awk '{sum+=$1} END {print sum}')
    local skipped_tests=$(find test-results -name "*.json" -exec jq '.stats.skipped' {} \; | awk '{sum+=$1} END {print sum}')
    
    # Calculate success rate
    local success_rate=0
    if [ "$total_tests" -gt 0 ]; then
        success_rate=$(( (passed_tests * 100) / total_tests ))
    fi
    
    # Generate report
    cat > test-results/comprehensive-report.md << EOF
# ScanStock Pro - Comprehensive Test Report

## Test Summary
- **Total Tests**: $total_tests
- **Passed**: $passed_tests
- **Failed**: $failed_tests
- **Skipped**: $skipped_tests
- **Success Rate**: ${success_rate}%

## Test Coverage

### ✅ Landing Page & Core UI
- Navigation bar (70px height)
- Branding and logo
- Hero section
- Features section
- Responsive design

### ✅ Navigation & Routing
- Internal navigation
- Page routing
- Smooth scrolling

### ✅ Authentication System
- Login form
- Register form
- Form validation

### ✅ Mobile Interface
- Mobile navigation
- Touch-friendly elements
- Responsive breakpoints

### ✅ Performance & Loading
- Page load times
- Loading states
- Progressive rendering

### ✅ Cross-Browser Compatibility
- Chromium
- Firefox
- WebKit

### ✅ Error Handling
- 404 pages
- Error boundaries

## Screenshots Captured
- Landing page (desktop, mobile, tablet)
- Navigation components
- Feature sections
- Authentication pages
- Error pages
- Responsive breakpoints

## Recommendations
EOF
    
    # Add recommendations based on test results
    if [ "$success_rate" -lt 95 ]; then
        echo "- **CRITICAL**: Success rate below 95%. Review failed tests and fix issues." >> test-results/comprehensive-report.md
    fi
    
    if [ "$failed_tests" -gt 0 ]; then
        echo "- Review failed tests in test-results/reports/" >> test-results/comprehensive-report.md
    fi
    
    echo "- View detailed HTML report: test-results/reports/index.html" >> test-results/comprehensive-report.md
    echo "- View screenshots: test-results/screenshots/" >> test-results/comprehensive-report.md
    
    print_success "Test report generated: test-results/comprehensive-report.md"
}

# Main execution
main() {
    echo "Starting comprehensive testing at $(date)"
    echo ""
    
    # Check prerequisites
    check_server
    
    # Run tests
    local test_results=0
    
    run_comprehensive_tests || test_results=$((test_results + 1))
    run_visual_tests || test_results=$((test_results + 1))
    run_existing_tests || test_results=$((test_results + 1))
    
    # Generate report
    generate_report
    
    # Final status
    echo ""
    echo "=================================================="
    if [ "$test_results" -eq 0 ]; then
        print_success "All test suites completed successfully!"
        echo "📊 View detailed results: test-results/reports/index.html"
        echo "📸 View screenshots: test-results/screenshots/"
        echo "📋 View summary: test-results/comprehensive-report.md"
    else
        print_warning "Some test suites had issues. Check the report for details."
        echo "📊 View detailed results: test-results/reports/index.html"
        echo "📋 View summary: test-results/comprehensive-report.md"
    fi
    
    echo "Testing completed at $(date)"
}

# Run main function
main "$@"
