import streamlit as st

multi = """
# Some of the improvements to be made

* Move from a streamlit app to a fastapi app+react frontend.
* Use langchain to generate the prompts and responses.
* Create a ChromaDB to store the activies and use this to generate the prompts.
* Create many more prompts and responses to each type of measure to be analysed in the activities.
* Create a dashboard to show the results of the activities.
* Read the activities from the postgres database.
* Use the feedback from the activities to get the most populat ones and use as the gold standard to analyse new activities.
"""
st.markdown(multi)
