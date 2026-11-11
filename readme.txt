# Step 1: Go to the folder where you copied the 3 files
cd "C:\path\to\your\folder"

# Step 2: Create a virtual environment (anaconda)
conda create --name my_project python=3.14

# Step 3: Activate it
conda activate my_project

# Step 4: Install all dependencies
pip install -r requirements.txt

# Step 5: Run the app
python post_surgery_rehab.py
