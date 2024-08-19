use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
pub struct WinRTError {
    pub message: String,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct ConvertError {
    pub message: String,
}
