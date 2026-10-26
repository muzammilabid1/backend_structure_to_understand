#!/bin/bash
# Test name to k6 script mapping
declare -A K6_TEST_MAPPING
K6_TEST_MAPPING[readingLog]="add-reading-log-scenario/add-reading-log.js"
K6_TEST_MAPPING[teacherAddReadingLog]="add-reading-log-scenario/teacher-add-reading-log.js"
K6_TEST_MAPPING[teacherAssigningStickerOnActivityFeed]="teacherAssigningStickerOnActivityFeed.js"
K6_TEST_MAPPING[teacherLeavingCommentOnActivityFeed]="teacherLeavingCommentOnActivityFeed.js"
K6_TEST_MAPPING[teacherTopicScheduling]="schedule-topics/scheduleTopic.js"

# Cleanup function to remove generated test data files
cleanup_test_data() {
    echo ""
    echo "🧹 Cleaning up test data files..."

    # Remove temp-data directories and their contents
    if [ -d "temp-data" ]; then
        rm -rf temp-data/*
        echo "  ✅ Cleaned up main temp-data directory"
    fi

    # Clean up test-specific temp-data directories
    for test_dir in */temp-data; do
        if [ -d "$test_dir" ]; then
            rm -rf "$test_dir"/*
            echo "  ✅ Cleaned up $test_dir"
        fi
    done

    # Clean up any other temporary files that might be generated
    find . -name "*.tmp" -type f -delete 2>/dev/null || true
    find . -name "test_*.json" -type f -delete 2>/dev/null || true
    find . -name "test_*.csv" -type f -delete 2>/dev/null || true

    echo "  ✅ Test data cleanup completed"
}



# Check if test name parameter is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <test-name> [--data-only]"
    echo ""
    echo "Available test names:"
    echo "  readingLog    - Generate parent/pupil/topic data for reading log tests"
    echo "  teacherAddReadingLog    - Generate teacher data for reading log tests"
    echo ""
    echo "Options:"
    echo "  --data-only   Only generate test data, don't run k6 tests"
    echo ""
    echo "Examples:"
    echo "  $0 readingLog              # Generate data and run k6 test"
    echo "  $0 readingLog --data-only  # Only generate test data"
    exit 1
fi

TEST_NAME=$1
DATA_ONLY_FLAG=$2

echo "Initializing test environment for k6 load testing"
echo "Test type: $TEST_NAME"

echo "Generating test user credentials..."

# generateCreds returns a temp file path with the password and hash
TEMP_FILE=$(node generateCreds.js)
if [ $? -ne 0 ]; then
    echo "Error: Failed to generate credentials"
    exit 1
fi

# Check if temp file exists
if [ ! -f "$TEMP_FILE" ]; then
    echo "Error: Credentials file not found"
    exit 1
fi

# Read password and hash from the temporary file
PASSWORD=$(sed -n '1p' "$TEMP_FILE")
HASHED_PASSWORD=$(sed -n '2p' "$TEMP_FILE")

# Clean up the temporary file immediately after reading
rm -f "$TEMP_FILE"

# Verify we got the credentials
if [ -z "$PASSWORD" ] || [ -z "$HASHED_PASSWORD" ]; then
    echo "Error: Failed to read credentials"
    exit 1
fi

# Store the password in an environment variable for k6 scripts
export TEST_USER_PASSWORD="${PASSWORD}"

echo "TEST_USER_PASSWORD exported for k6 scripts"

if [ "$ENV" = "development" ]; then
    echo "🔐 Using local database credentials"
    # local database connection setup
    export PGPASSWORD='postgres' # for testing
    export PGHOST='localhost'
    export PGPORT=5432
    export PGUSER=postgres
    export PGDATABASE=postgres
fi

if [ "$ENV" = "production" ]; then
    echo "🔐 Retrieving production database credentials from AWS Secrets Manager..."

    PG_HOST=$(jq -r '.db_host' config.json)  # read the db_host from the config.json file

    # Safety check: prevent running load tests against main or prod databases
    if [[ "$PG_HOST" == *"main"* ]] || [[ "$PG_HOST" == *"prod"* ]]; then
        echo "❌ ERROR: Load testing is not allowed against databases containing 'main' or 'prod' in hostname"
        echo "   This is a safety measure to prevent accidental load testing of production systems"
        exit 1
    fi

    export PGHOST=$PG_HOST

    # Get the secret once and store it
    DB_SECRET=$(aws secretsmanager get-secret-value --secret-id DB-CRED-PROD --query SecretString --output text)

    export PGUSER=$(echo "$DB_SECRET" | jq -r '."lwpuser-username"')
    export PGPASSWORD=$(echo "$DB_SECRET" | jq -r '."lwpuser-password"')
    export PGDATABASE='postgres'
    export PGPORT=5432

    skip_recaptcha_token=$(aws secretsmanager get-secret-value --secret-id staging-captcha-skip --query SecretString --output text)
    export SKIP_RECAPTCHA_SECRET_TOKEN=$(echo "$skip_recaptcha_token" | jq -r '.SKIP_RECAPTCHA_SECRET_TOKEN')

    # Verify we got all required values
    if [ -z "$PGHOST" ] || [ -z "$PGPORT" ] || [ -z "$PGUSER" ] || [ -z "$PGDATABASE" ]; then
        echo "❌ Failed to parse database credentials from secret"
        exit 1
    fi

    echo "✅ Database credentials loaded successfully"
fi


# update the password hashes in the database
echo "Updating test user password in database..."
PGPASSWORD=${PGPASSWORD} PGHOST=${PGHOST} PGPORT=${PGPORT} PGUSER=${PGUSER} PGDATABASE=${PGDATABASE} psql -c "UPDATE lwp_user SET password = '${HASHED_PASSWORD}'"

if [ $? -ne 0 ]; then
    echo "❌ Failed to update test user password in database"
    exit 1
fi

# TODO: should we check that the password is updated?

# Generate test data for the specified test type
echo "Generating test data for $TEST_NAME tests..."
node getTestData.js "$TEST_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate test data for $TEST_NAME"
    exit 1
fi

echo "✅ Test data generated successfully for $TEST_NAME"

# Check if we should only generate data
if [ "$DATA_ONLY_FLAG" = "--data-only" ]; then
    echo "✅ Test environment ready! (data only mode)"
    echo "Password available in TEST_USER_PASSWORD environment variable"
    echo "To run tests manually: k6 run ${K6_TEST_MAPPING[$TEST_NAME]}"
    echo "💡 Note: Test data files preserved for inspection. Run cleanup manually if needed."
    exit 0
fi

# Run the corresponding k6 test
K6_SCRIPT="${K6_TEST_MAPPING[$TEST_NAME]}"

if [ -z "$K6_SCRIPT" ]; then
    echo "⚠️  No k6 test script mapped for test type: $TEST_NAME"
    echo "Available k6 test mappings:"
    for test_name in "${!K6_TEST_MAPPING[@]}"; do
        echo "  $test_name -> ${K6_TEST_MAPPING[$test_name]}"
    done
    echo ""
    echo "Test data generated successfully. Run k6 manually if needed."
    # Clean up data since no test will run
    cleanup_test_data
    exit 0
fi

# Check if k6 script exists
if [ ! -f "$K6_SCRIPT" ]; then
    echo "⚠️  K6 script not found: $K6_SCRIPT"
    echo "Test data generated successfully. Create the k6 script or run manually."
    # Clean up data since no test will run
    cleanup_test_data
    exit 0
fi

echo ""
echo "🚀 Running k6 test: $K6_SCRIPT"
echo "======================================"

mkdir -p logs




# if there is a second argument to the script we use it as the config name
CONFIG_NAME=""
K6_OPTIONS=""

# Check if we have a config parameter (this would be $3 if $2 is --data-only)
# or $2 if it's not --data-only
if [ "$DATA_ONLY_FLAG" != "--data-only" ] && [ -n "$2" ]; then
    CONFIG_NAME=$2
    K6_OPTIONS="-e CONFIG=$CONFIG_NAME"
elif [ "$DATA_ONLY_FLAG" = "--data-only" ] && [ -n "$3" ]; then
    CONFIG_NAME=$3
    K6_OPTIONS="-e CONFIG=$CONFIG_NAME"
fi

# Construct log file name with proper variable handling
if [ -n "$CONFIG_NAME" ]; then
    LOG_FILE_NAME=$(date +%Y-%m-%d_%H-%M-%S)_${TEST_NAME}_${CONFIG_NAME}.json
else
    LOG_FILE_NAME=$(date +%Y-%m-%d_%H-%M-%S)_${TEST_NAME}_sanity_check.json
fi
SUMMARY_OPTIONS="--summary-export logs/$LOG_FILE_NAME"

# Run the k6 test
k6 run --summary-mode=full $SUMMARY_OPTIONS $K6_OPTIONS "$K6_SCRIPT"

K6_EXIT_CODE=$?

echo ""
echo "======================================"

if [ $K6_EXIT_CODE -eq 0 ]; then
    echo "✅ K6 test completed successfully!"
else
    echo "❌ K6 test failed (exit code: $K6_EXIT_CODE)"
    echo "Check the k6 output above for details"
fi

# Clean up test data files after k6 test completion (success or failure)
cleanup_test_data

if [ $K6_EXIT_CODE -ne 0 ]; then
    exit $K6_EXIT_CODE
fi

echo ""
echo "🎉 Test environment setup and execution completed!"
