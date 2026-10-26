import json
import time
import os

import pandas as pd
import streamlit as st
from pathlib import Path
from utils.llm import evaluate_batch, evaluate_insights, generate_message_data, retrieve_batch, retrieve_file_content

BATCH_FILE_NAME = '.batch_processing_id'
COMPLETE_BATCH_FILE_NAME = '.batch_processed_id'

if "selected_id" not in st.session_state:
    st.session_state.selected_id = None

if "current_page_index" not in st.session_state:
    st.session_state.current_page_index = 0

if "review_processed" not in st.session_state:
    st.session_state.review_processed = None

if "reviews_processed" not in st.session_state:
    st.session_state.reviews_processed = {}


@st.cache_data(show_spinner=False)
def load_activities():
    df = pd.read_parquet("resources/data/activities.parquet")
    return df

get_average_activity_rating = lambda y: sum([item["Score"] for item in st.session_state.reviews_processed.get(y, {}).get("Activities", [])]) / 5.0


@st.cache_data(show_spinner=False)
def load_activities_page(input_df, page_size=10):
    input_df.sort_values(
        by=['activityId'],
        key=lambda x: x.map(get_average_activity_rating),
        inplace=True,
        ignore_index=True
    )
    input_df.reset_index(drop=True)
    df = [
        input_df.loc[i : i + page_size - 1, :]
        for i in range(0, len(input_df), page_size)
    ]
    return df

def get_activity_data(activity_id):
    with open(f"resources/data/{activity_id}.json", "rb") as f:
        return json.loads(f.read())

def get_screenshot_path(activity_id):
    return f"resources/images/{activity_id}.png"

def review_activity(activity_id):
    return evaluate_insights(get_activity_data(activity_id), get_screenshot_path(activity_id))

def load_batch_data(file_id):
    content = retrieve_file_content(file_id)
    for line in content.splitlines():
        json_line = json.loads(line)
        this_id = json_line['custom_id']
        result = json.loads(line)['response']['body']['choices'][0]['message']['content']
        st.session_state.reviews_processed[int(this_id)] = json.loads(result)


def view_activity(idx):
    st.session_state.selected_id = idx

has_batch_file = os.path.isfile(BATCH_FILE_NAME)
has_complete_batch_file = os.path.isfile(COMPLETE_BATCH_FILE_NAME)

if has_complete_batch_file:
    try:
        load_batch_data(Path(COMPLETE_BATCH_FILE_NAME).read_text())
    except Exception:
        try:
            os.remove(COMPLETE_BATCH_FILE_NAME)
            st.toast("Existing data seems stale; removed it.")
        except Exception: st.toast("Errored processing existing data and errored removing current file!")

# Dataset
dataset = load_activities()
pages = load_activities_page(dataset)
current_page = pages[st.session_state.current_page_index]

if st.session_state.selected_id is None:
    st.subheader(
        f"Activities - Page {st.session_state.current_page_index + 1} from {len(pages)}"
    )

    if has_batch_file:
        st.session_state.processing = True
        st.info('Processing batch request at OpenAI.')
        if st.button("Refresh status", key="refresh_process_all_status_button"):
            batch_job = retrieve_batch(Path(BATCH_FILE_NAME).read_text())
            if batch_job.status == 'completed':
                try: os.remove(BATCH_FILE_NAME)
                except Exception: st.toast("Couldn't delete old batch ID!")

                with open(COMPLETE_BATCH_FILE_NAME, "w") as batch_marker:
                    batch_marker.write(batch_job.output_file_id)

                st.session_state.processing = False
                st.rerun()
            else:
                st.write(batch_job)
    else:
        st.session_state.processing = False

    if st.button("Process All", key="process_all_button", disabled=st.session_state.processing):
        if not os.path.isfile(BATCH_FILE_NAME):
            try:
                with open(BATCH_FILE_NAME, "w") as batch_marker:
                    batch_job = evaluate_batch(dataset, get_activity_data, get_screenshot_path)
                    batch_marker.write(batch_job.id)
                    st.session_state.processing = True
            except Exception:
                try: os.remove(BATCH_FILE_NAME)
                except Exception: pass

                raise

        st.rerun()

    st.divider()

    # Page Content
    fields = ["ID", "Activity", "Rating", "Actions"]

    with st.container(border=True):
        cols = st.columns([0.1, 0.6, 0.1, 0.2])

        # Header
        for col, field in zip(cols, fields):
            col.write("**" + field + "**")

    with st.container(border=True):
        # Columns
        for idx, row in current_page.iterrows():
            item_cols = st.columns([0.1, 0.6, 0.1, 0.2])
            for i, value in enumerate(row[:2]):
                item_cols[i].write(str(value))

            item_cols[2].empty()
            item_cols[2].write(get_average_activity_rating(row["activityId"]))

            placeholder = item_cols[-1].empty()
            placeholder.button(
                "View",
                key=row["activityId"],
                on_click=view_activity,
                args=[row["activityId"]],
                type="primary",
                use_container_width=True,
            )

    with st.container(border=True):
        prev, _, next = st.columns([0.2, 0.6, 0.2])
        if next.button("Next", type="secondary", use_container_width=True):
            if st.session_state.current_page_index > len(pages):
                st.session_state.current_page_index = 0
            else:
                st.session_state.current_page_index += 1
            st.rerun()

        if prev.button("Previous", type="secondary", use_container_width=True):
            if st.session_state.current_page_index < 0:
                st.session_state.current_page_index = len(pages)
            else:
                st.session_state.current_page_index -= 1
            st.rerun()


elif (
    st.session_state.selected_id is not None
):
    if st.session_state.reviews_processed.get(st.session_state.selected_id):
        st.session_state.review_processed = st.session_state.reviews_processed[st.session_state.selected_id]

    st.subheader(f"Activity - {st.session_state.selected_id}")

    if st.button("Back", type="secondary"):
        st.session_state.selected_id = None
        st.session_state.current_page_index = 0
        st.session_state.review_processed = None
        st.rerun()

    st.divider()

    item = dataset[dataset.activityId == st.session_state.selected_id].iloc[0]

    info_cols = st.columns([0.50, 0.50])

    with info_cols[0].container():
        cols = st.columns(4)
        cols[0].write("**ID**")
        cols[1].write(str(item["activityId"]))
        cols[2].write("**Name**")
        cols[3].write(str(item["activityName"]))
        st.divider()
        st.write("**Content**")
        st.write(str(item["pageContent"]))

    with info_cols[1].container(border=True):
        info_cols[1].image(
            f"resources/images/{st.session_state.selected_id}.png",
            use_container_width=True,
        )

    st.divider()

    if st.session_state.review_processed is None:
        if st.button("Review", type="primary", use_container_width=True, key='start_review_button'):
            st.session_state.review_processed = review_activity(item["activityId"])
            st.rerun()
    else:
        activities = st.session_state.review_processed["Activities"]
        score = sum([item["Score"] for item in activities]) / 5.0
        suggestions = len(
            [
                item["Suggestions"]
                for item in activities
                if not item["Suggestions"].startswith("No suggestions")
            ]
        )

        with st.container(border=True):
            col1, col2 = st.columns(2)
            col1.metric("Score", f"{score:.1f} of 10")
            col2.metric("Suggestions to Improve", f"{suggestions} Suggestion(s)")

        review, suggestions = st.tabs(["Review Scores", "Suggestions"])
        with review:
            for item in activities:
                with st.container(border=True):
                    col1, col2, col3 = st.columns([0.3, 0.2, 0.6])
                    col1.write(f"**{item['Question']}**")
                    score_text = "".join(["⭐" for i in range(item["Score"])])
                    col2.write(f"**Score**: {score_text}")
                    col3.write(item["Reasoning"])

        with suggestions:
            for item in activities:
                with st.container(border=True):
                    suggestions = item["Suggestions"]
                    if not suggestions.startswith("No suggestions"):
                        st.write(f"💡    ***{suggestions}***")
