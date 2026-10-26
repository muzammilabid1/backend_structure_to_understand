import streamlit as st

if "logged_in" not in st.session_state:
    st.session_state.logged_in = True

menus = [
    ("page/reports/activities.py", "Activities", ":material/dashboard:", True),
    ("page/reports/improvements.py", "Improvements", ":material/dashboard:", False),
    ("page/team.py", "Team", ":material/group:", False),
]

pages = []
for i, (path, title, icon, default) in enumerate(menus):
    page = st.Page(path, title=title, icon=icon, default=default)
    pages.append(page)


pg = st.navigation(
    {
        "Reports": pages,
    }
)

# Set page config
st.set_page_config(
    page_title="Learning with Parents - Automated Content Review",
    page_icon=":books:",
    layout="wide",
)
st.logo("resources/images/lwp-logo.png")

pg.run()
