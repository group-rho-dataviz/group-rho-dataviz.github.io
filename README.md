# The Attention Gap: Media Coverage of Global Conflicts

## Final Project for the Data Visualization Course

By Group Rho:

- Stefano Passaggio (4875279)
- Fabrizio Sardo (5250158)

Website: <https://group-rho-dataviz.github.io/>

Methodology Report: <https://group-rho-dataviz.github.io/methodology.html>

---

## The Proposal

Our proposal is to explore how different conflicts around the world are covered by the media.
In particular, we would like to examine the differences between media outlets from different countries and the types of conflicts they focus on.

Next, we would like to present concrete examples of underreported conflicts.

In the following section, we aim to identify whether these conflicts share common characteristics.

The final section is dedicated to our takeaways and conclusions and provides a more global perspective on the issue.

## Data Sources

The GDELT and ACLED datasets were used for this project.

[ACLED](https://acleddata.com/)

[GDELT](https://www.gdeltproject.org/)

In particular, the GDELT data has been queried using Google BigQuery; since data has already been processed and stored in Parquet format by us, but resulting files were still too heavy to be uploaded to our github repository, you can instead directly access the normalized GDELT dataset files from our [Kaggle folder](https://www.kaggle.com/datasets/fabriziosardo/the-attention-gap-gdelt-dataviz-project).

---

## Folder Structure

```text
.
├── data/
│   ├── ACLED/
│   ├── GDELT/
│   └── processed/
├── preprocessing/
├── src/
│   ├── css/
│   ├── js/
│   ├── json/
│   └── images/
├── methodology.html
└── index.html
```

`data/ACLED/` and `data/GDELT/` contain the original raw data files extracted from the respective sources, while `data/processed/` contains processed data files used for the visualizations.

In order to serve this website locally, you can simply clone this repository and open the `index.html` file in your web browser since all the data files are already included in the `data/processed/` folder..

## Preprocessing

The preprocessing steps are described in detail in our [methodology report](https://group-rho-dataviz.github.io/methodology.html).

We used Python (Pandas) for data cleaning and aggregation, and we created Jupyter Notebooks to document our work.
