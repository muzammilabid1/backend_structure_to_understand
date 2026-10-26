import base64
import json
import os
import tempfile

import streamlit as st
from openai import OpenAI
from pathlib import Path

client = OpenAI()

# Load prompts from files in the prompts directory
prompts = {path.stem: path.read_text() for path in Path("prompts/").glob("*.prompt")}


# Function to encode the image
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


response_schema = {
    "type": "OBJECT",
    "properties": {
        "Activities": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "Activity ID": {"type": "STRING"},
                    "Question": {
                        "type": "STRING",
                    },
                    "Score": {
                        "type": "INT",
                    },
                    "Reasoning": {
                        "type": "STRING",
                    },
                    "Suggestions": {
                        "type": "STRING",
                    },
                },
                "required": [
                    "Activity ID",
                    "Question",
                    "Score",
                    "Reasoning",
                    "Suggestions",
                ],
            },
        },
    },
    "required": ["Activities"],
}

def generate_message_data(json_data, screenshot_path=None):
    # if screenshot_path:
    #     base64_image = encode_image(screenshot_path)

    activity_id = json_data[0]["activityId"]

    prompt_2 = f"""
        Analyse the activity’s page design based on the following, give a score (1-10) for each question:
        
    **Activity ID**:
    
    {activity_id}
        
    **Question**
        1. Is the text minimal and broken into digestible sections?
        2. Are images, dice, buttons, or other visuals prominently displayed above the fold?
        3. Are bullet points used over prose where appropriate?
        4. Does the page use sentence case formatting for titles and appropriate subheadings (e.g., 'You will need', 'How to play')?
        5. Is extra information provided in modals if necessary?
        Provide suggestions for improvement if any of these criteria are not met.
        
    
    **Score**
        1. Score (1-10)
        2. Score (1-10)
        3. Score (1-10)
        4. Score (1-10)
        5. Score (1-10)
        
        
    **Reasoning**
        1. Reason
        2. Reason
        3. Reason
        4. Reason
        5. Reason
        
    **Suggestions**
        1. Highlight areas for improvement if necessary otherwise state 'No suggestions'
        2. Highlight areas for improvement if necessary otherwise state 'No suggestions'
        3. Highlight areas for improvement if necessary otherwise state 'No suggestions'
        4. Highlight areas for improvement if necessary otherwise state 'No suggestions'
        5. Highlight areas for improvement if necessary otherwise state 'No suggestions'
    """

    combined_prompt = f"""
    The following JSON data represents educational activities on a webpage:
    {json.dumps(json_data, indent=2)}

    Use the json data and the encoded image to answer the following questions.

    {prompt_2}
    
    **Response Schema**
    
    {response_schema}
    
    **Remember:**
        * Respond in the relevant schema
        * Do not use markdown in your response
        * Answer all questions
        * Assume all videos are functional despite any privacy settings errors
        * Highlight areas for improvement if necessary otherwise state 'No suggestions'
    """

    return [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": combined_prompt,
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"https://lwp-activity-images.s3.eu-west-2.amazonaws.com/{activity_id}.png"},
                },
            ],
        }
    ]


def evaluate_insights(json_data, screenshot_path=None):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=generate_message_data(json_data, screenshot_path)
    )
    return json.loads(response.choices[0].message.content)

def evaluate_batch(activity_dataset, get_activity_data, get_screenshot_path):
    temp = tempfile.TemporaryFile(suffix='.jsonl')

    for index, activity in activity_dataset.iterrows():
        activity_id = activity.get("activityId")

        try:
            task = {
                "custom_id": str(activity_id),
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": "gpt-4o-mini",
                    "response_format": { 
                        "type": "json_object"
                    },
                    "messages": generate_message_data(get_activity_data(activity_id), get_screenshot_path(activity_id))
                }
            }
            
            temp.write((json.dumps(task) + '\n').encode('ASCII'))
        except Exception as e:
            print(f"{activity_id} failed with error {e}")

    temp.seek(0)

    batch_file = client.files.create(
        file=temp,
        purpose="batch"
    )

    batch_job = client.batches.create(
        input_file_id=batch_file.id,
        endpoint="/v1/chat/completions",
        completion_window="24h"
    )

    temp.close()

    return batch_job

def retrieve_batch(batch_id):
    return client.batches.retrieve(batch_id)

@st.cache_data
def retrieve_file_content(file_id):
    return client.files.content(file_id).content